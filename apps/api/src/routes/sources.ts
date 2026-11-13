import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
import { mapSource, mapScrapeRun, mapScrapeRequest, mapListingIngest, unmapSellerType } from "../lib/serialize.js";
import { ForbiddenError, NotFoundError, ConflictError } from "../lib/http-errors.js";
import { requireMaster } from "../lib/current-operator.js";

const patchBody = z.object({ active: z.boolean() });
const runsQuery = z.object({ cursor: z.string().optional(), limit: z.string().optional() });
const runBody = z.object({
  sellerType: z.enum(["individual", "dealer"]).optional(),
  limit: z.number().int().positive().optional(),
});

const MAX_HTML_CHARS = 1_500_000;
const MAX_PAGES_PER_REQUEST = 10;

const ingestPage = z.object({
  html: z.string().min(200).max(MAX_HTML_CHARS),
  page: z.number().int().positive().optional(),
  baseUrl: z.string().url().optional(),
});
const ingestBody = z.object({
  pages: z.array(ingestPage).min(1).max(MAX_PAGES_PER_REQUEST),
});

// Só shopcar tem self-service de liga/desliga — webmotors/olx nascem
// desligadas por decisão de projeto (CLAUDE.md) e só mudam por
// homologação/config manual, nunca pela API.
const SELF_SERVICE_SOURCES = new Set(["shopcar"]);
const LISTING_INGEST_SOURCES = new Set(["shopcar"]);

/** GET/PATCH /api/sources* — Fontes (docs/API.md seção 9). */
export async function sourceRoutes(app: FastifyInstance) {
  app.get("/api/sources", async (_req, reply) => {
    const { rows: sources } = await pool.query("SELECT * FROM fontes ORDER BY fonte");
    for (const source of sources) {
      const { rows: lastRun } = await pool.query(
        "SELECT * FROM scrape_runs WHERE fonte = $1 ORDER BY finalizado_em DESC LIMIT 1",
        [source.fonte],
      );
      source.ultima_execucao = lastRun[0] ?? null;

      const { rows: pendente } = await pool.query(
        "SELECT * FROM execucoes_solicitadas WHERE fonte = $1 AND processado_em IS NULL ORDER BY solicitado_em DESC LIMIT 1",
        [source.fonte],
      );
      source.pedido_pendente = pendente[0] ?? null;

      const { rows: ingestCount } = await pool.query(
        "SELECT count(*)::int AS n FROM ingestao_listagens WHERE fonte = $1 AND processado_em IS NULL",
        [source.fonte],
      );
      source.ingestao_pendente = ingestCount[0]?.n ?? 0;
    }
    reply.send(sources.map(mapSource));
  });

  app.get("/api/sources/:source/runs", async (req, reply) => {
    const source = (req.params as { source: string }).source;
    const q = runsQuery.parse(req.query);
    const limit = parseLimit(q.limit);
    const cursorParts = decodeCursor(q.cursor);
    const values: unknown[] = [source];
    let cursorClause = "";
    if (cursorParts) {
      values.push((cursorParts as [number])[0]);
      cursorClause = `AND id < $${values.length}`;
    }
    values.push(limit);

    const { rows } = await pool.query(
      `SELECT * FROM scrape_runs WHERE fonte = $1 ${cursorClause}
        ORDER BY id DESC LIMIT $${values.length}`,
      values,
    );
    const last = rows[rows.length - 1];
    reply.send({
      items: rows.map(mapScrapeRun),
      nextCursor: rows.length === limit && last ? encodeCursor([Number(last.id)]) : null,
    });
  });

  app.patch("/api/sources/:source", async (req, reply) => {
    await requireMaster(req);
    const source = (req.params as { source: string }).source;
    const body = patchBody.parse(req.body);
    if (!SELF_SERVICE_SOURCES.has(source)) {
      throw new ForbiddenError(
        `"${source}" não pode ser ligada/desligada pela API — segue a escada de escalonamento da seção 4.5 do SPEC.`,
      );
    }
    const { rows } = await pool.query("UPDATE fontes SET ativa = $2 WHERE fonte = $1 RETURNING *", [source, body.active]);
    if (!rows[0]) throw new NotFoundError("Fonte não encontrada.");
    reply.send(
      mapSource({ ...rows[0], ultima_execucao: null, pedido_pendente: null, ingestao_pendente: 0 }),
    );
  });

  // Botão "Rodar coleta agora" (Fase 4). Não dispara nada: só grava o
  // pedido em execucoes_solicitadas — o coletor Python é quem lê essa
  // tabela quando roda (fronteira TS/Python é o Postgres, SPEC seção 5).
  app.post("/api/sources/:source/run", async (req, reply) => {
    const actor = await requireMaster(req);
    const source = (req.params as { source: string }).source;
    const body = runBody.parse(req.body);
    if (!SELF_SERVICE_SOURCES.has(source)) {
      throw new ForbiddenError(
        `"${source}" não pode ter coleta disparada pela API — segue a escada de escalonamento da seção 4.5 do SPEC.`,
      );
    }

    const { rows: fonteRows } = await pool.query("SELECT fonte FROM fontes WHERE fonte = $1", [source]);
    if (!fonteRows[0]) throw new NotFoundError("Fonte não encontrada.");

    const { rows: pendenteRows } = await pool.query(
      "SELECT id FROM execucoes_solicitadas WHERE fonte = $1 AND processado_em IS NULL",
      [source],
    );
    if (pendenteRows[0]) throw new ConflictError("Já existe um pedido de coleta pendente para essa fonte.");

    const { rows } = await pool.query(
      `INSERT INTO execucoes_solicitadas (fonte, tipo_anunciante_filtro, limite, solicitado_por)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [source, unmapSellerType(body.sellerType), body.limit ?? null, actor.login],
    );
    reply.status(202).send(mapScrapeRequest(rows[0]!));
  });

  // Ingestão assistida: HTML da listagem que o usuário já abriu no browser.
  // O coletor Python processa a fila (cli ingerir) sem GET na fonte.
  app.post(
    "/api/sources/:source/ingest-listings",
    { bodyLimit: 16 * 1024 * 1024 },
    async (req, reply) => {
      const actor = await requireMaster(req);
      const source = (req.params as { source: string }).source;
      if (!LISTING_INGEST_SOURCES.has(source)) {
        throw new ForbiddenError(
          `"${source}" não aceita ingestão de listagem — só shopcar por enquanto.`,
        );
      }
      const body = ingestBody.parse(req.body);
      const { rows: fonteRows } = await pool.query("SELECT fonte FROM fontes WHERE fonte = $1", [source]);
      if (!fonteRows[0]) throw new NotFoundError("Fonte não encontrada.");
      const defaultBase =
        source === "shopcar" ? "https://www.shopcar.com.br" : `https://www.${source}.com.br`;

      const inserted = [];
      for (const page of body.pages) {
        const baseUrl = page.baseUrl ?? defaultBase;
        const { rows } = await pool.query(
          `INSERT INTO ingestao_listagens (fonte, pagina, html, base_url, solicitado_por)
           VALUES ($1, $2, $3, $4, $5) RETURNING id, fonte, pagina, solicitado_em, processado_em, iniciado_em, erro, resultado`,
          [source, page.page ?? null, page.html, baseUrl, actor.login],
        );
        inserted.push(mapListingIngest(rows[0]!));
      }
      reply.status(202).send({ items: inserted, queued: inserted.length });
    },
  );

  app.get("/api/sources/:source/ingest-listings", async (req, reply) => {
    await requireMaster(req);
    const source = (req.params as { source: string }).source;
    const { rows } = await pool.query(
      `SELECT id, fonte, pagina, solicitado_em, iniciado_em, processado_em, erro, resultado, scrape_run_id
         FROM ingestao_listagens
        WHERE fonte = $1
        ORDER BY solicitado_em DESC
        LIMIT 40`,
      [source],
    );
    reply.send({ items: rows.map((r) => mapListingIngest(r)) });
  });
}

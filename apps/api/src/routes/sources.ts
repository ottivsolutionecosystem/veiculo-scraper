import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
import { mapSource, mapScrapeRun, mapScrapeRequest, unmapSellerType } from "../lib/serialize.js";
import { ForbiddenError, NotFoundError, ConflictError } from "../lib/http-errors.js";

const patchBody = z.object({ active: z.boolean() });
const runsQuery = z.object({ cursor: z.string().optional(), limit: z.string().optional() });
const runBody = z.object({
  sellerType: z.enum(["individual", "dealer"]).optional(),
  limit: z.number().int().positive().optional(),
});

// Só shopcar tem self-service de liga/desliga — webmotors/olx nascem
// desligadas por decisão de projeto (CLAUDE.md) e só mudam por
// homologação/config manual, nunca pela API.
const SELF_SERVICE_SOURCES = new Set(["shopcar"]);

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
    const source = (req.params as { source: string }).source;
    const body = patchBody.parse(req.body);
    if (!SELF_SERVICE_SOURCES.has(source)) {
      throw new ForbiddenError(
        `"${source}" não pode ser ligada/desligada pela API — segue a escada de escalonamento da seção 4.5 do SPEC.`,
      );
    }
    const { rows } = await pool.query("UPDATE fontes SET ativa = $2 WHERE fonte = $1 RETURNING *", [source, body.active]);
    if (!rows[0]) throw new NotFoundError("Fonte não encontrada.");
    reply.send(mapSource({ ...rows[0], ultima_execucao: null, pedido_pendente: null }));
  });

  // Botão "Rodar coleta agora" (Fase 4). Não dispara nada: só grava o
  // pedido em execucoes_solicitadas — o coletor Python é quem lê essa
  // tabela quando roda (fronteira TS/Python é o Postgres, SPEC seção 5).
  app.post("/api/sources/:source/run", async (req, reply) => {
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
      [source, unmapSellerType(body.sellerType), body.limit ?? null, "api"],
    );
    reply.status(202).send(mapScrapeRequest(rows[0]!));
  });
}

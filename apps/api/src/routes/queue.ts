import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { optionalOperator } from "../lib/current-operator.js";
import { isMaster } from "../lib/roles.js";
import { mapQueueRow, unmapSellerType } from "../lib/serialize.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
import { NO_OPEN_DEAL_SQL, NOT_STOCK_SQL } from "../lib/vehicle-lock.js";

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  sellerType: z.enum(["individual", "dealer"]).optional(),
  includeInactive: z.coerce.boolean().optional(),
  /** livres = mercado; mine = meus na fila; tagged = voltou com parecer */
  scope: z.enum(["untouched", "mine", "followup", "price_drop", "all", "tagged"]).optional(),
  operator: z.string().optional(),
  q: z.string().max(80).optional(),
  brand: z.string().max(40).optional(),
  priceMaxCents: z.coerce.number().int().positive().optional(),
  scoreBand: z.enum(["quente", "boa", "morna", "fria"]).optional(),
  source: z.string().max(40).optional(),
});

const statsQuery = z.object({
  sellerType: z.enum(["individual", "dealer"]).optional(),
  operator: z.string().optional(),
});

function sellerClause(
  sellerType: "individual" | "dealer" | undefined,
  values: unknown[],
): string {
  if (!sellerType) return "";
  values.push(unmapSellerType(sellerType));
  return `AND f.tipo_anunciante = $${values.length}`;
}

function listFilterClause(
  query: {
    q?: string;
    brand?: string;
    priceMaxCents?: number;
    scoreBand?: "quente" | "boa" | "morna" | "fria";
    source?: string;
  },
  values: unknown[],
): string {
  const parts: string[] = [];
  const text = query.q?.trim();
  if (text) {
    values.push(`%${text.replace(/[%_]/g, " ")}%`);
    const p = `$${values.length}`;
    parts.push(
      `AND (f.titulo_normalizado ILIKE ${p} OR f.marca ILIKE ${p} OR f.modelo ILIKE ${p} OR concat_ws(' ', f.marca, f.modelo, f.versao) ILIKE ${p})`,
    );
  }
  if (query.brand?.trim()) {
    values.push(query.brand.trim());
    parts.push(`AND upper(f.marca) = upper($${values.length})`);
  }
  if (query.priceMaxCents) {
    values.push(query.priceMaxCents);
    parts.push(`AND f.preco <= $${values.length}`);
  }
  if (query.scoreBand) {
    values.push(query.scoreBand);
    parts.push(`AND f.score_faixa = $${values.length}`);
  }
  if (query.source?.trim()) {
    values.push(query.source.trim().toLowerCase());
    parts.push(`AND f.fonte = $${values.length}`);
  }
  return parts.join("\n        ");
}

function pushOwner(values: unknown[], operatorId: number | undefined): string {
  values.push(operatorId ?? -1);
  return `$${values.length}`;
}

function scopeClause(
  scope: "untouched" | "mine" | "followup" | "price_drop" | "all" | "tagged" | undefined,
  operatorId: number | undefined,
  supervise: boolean,
  values: unknown[],
): string {
  if (scope === "all") {
    if (supervise) return "";
    const mine = pushOwner(values, operatorId);
    return `AND (
              f.consignador_id = ${mine}
              OR (
                f.consignador_id IS NULL
                AND (f.travado_ate IS NULL OR f.travado_ate < now())
              )
            )`;
  }
  if (scope === "followup") {
    const owner = supervise ? "" : `AND f.consignador_id = ${pushOwner(values, operatorId)}`;
    return `${owner}
            AND f.follow_up_em IS NOT NULL AND f.follow_up_em <= now()`;
  }
  if (scope === "price_drop") {
    return `AND f.preco_variacao IS NOT NULL AND f.preco_variacao < 0`;
  }
  if (scope === "tagged") {
    return `AND f.motivo_descarte IS NOT NULL`;
  }
  const mine = pushOwner(values, operatorId);
  if (scope === "mine") {
    return `AND f.consignador_id = ${mine}`;
  }
  return `AND (
            f.consignador_id IS NULL
            OR f.travado_ate IS NULL
            OR f.travado_ate < now()
            OR f.consignador_id = ${mine}
          )`;
}

/** GET /api/queue — Fila de trabalho da consignação (docs/API.md seção 1). */
export async function queueRoutes(app: FastifyInstance) {
  app.get("/api/queue/stats", async (req, reply) => {
    const query = statsQuery.parse(req.query);
    const actor = await optionalOperator(req);
    const supervise = actor ? isMaster(actor) : false;
    const values: unknown[] = [];
    const seller = sellerClause(query.sellerType, values);
    values.push(actor?.id ?? -1);
    const ownerRef = `$${values.length}`;
    const ownFollow = supervise ? "" : `AND f.consignador_id = ${ownerRef}`;

    const { rows } = await pool.query(
      `SELECT
          count(*) FILTER (WHERE f.ativo)::int AS online,
          count(*) FILTER (WHERE f.ativo
            AND (f.consignador_id IS NULL OR f.travado_ate IS NULL OR f.travado_ate < now()
                 OR f.consignador_id = ${ownerRef})
            ${NO_OPEN_DEAL_SQL})::int AS untouched,
          count(*) FILTER (WHERE f.ativo AND f.consignador_id = ${ownerRef} ${NO_OPEN_DEAL_SQL})::int AS mine,
          count(*) FILTER (WHERE f.ativo AND f.follow_up_em IS NOT NULL AND f.follow_up_em <= now()
                             ${ownFollow} ${NO_OPEN_DEAL_SQL})::int AS followup,
          count(*) FILTER (WHERE f.ativo AND f.preco_variacao < 0 ${NO_OPEN_DEAL_SQL})::int AS price_drop,
          count(*) FILTER (WHERE f.ativo AND f.motivo_descarte IS NOT NULL ${NO_OPEN_DEAL_SQL})::int AS tagged
         FROM fila_do_dia f
        WHERE 1=1
        ${NOT_STOCK_SQL}
        ${seller}`,
      values,
    );
    const rankingValues: unknown[] = [];
    const rankingSeller = sellerClause(query.sellerType, rankingValues);
    const { rows: rankingRows } = await pool.query(
      `SELECT o.nome AS consignador,
              count(*) FILTER (WHERE f.ultimo_contato_em >= date_trunc('day', now()))::int AS contacted_today,
              count(*) FILTER (WHERE f.estado = 'negotiating')::int AS negotiating,
              count(*) FILTER (WHERE f.estado IN ('requested', 'acquired'))::int AS in_pipeline
         FROM fila_do_dia f
         JOIN operadores o ON o.id = f.consignador_id AND o.ativo
        WHERE f.consignador_id IS NOT NULL
          ${NOT_STOCK_SQL}
          ${rankingSeller}
        GROUP BY o.id, o.nome
        HAVING count(*) FILTER (WHERE f.ultimo_contato_em >= date_trunc('day', now())) > 0
            OR count(*) FILTER (WHERE f.estado IN ('negotiating', 'requested')) > 0
        ORDER BY contacted_today DESC, negotiating DESC
        LIMIT 8`,
      rankingValues,
    );
    const row = rows[0]!;
    reply.send({
      online: row.online,
      untouched: row.untouched,
      mine: row.mine,
      followup: row.followup,
      priceDrop: row.price_drop,
      tagged: row.tagged,
      ranking: rankingRows.map((r) => ({
        operator: r.consignador as string,
        contactedToday: r.contacted_today as number,
        negotiating: r.negotiating as number,
        inPipeline: r.in_pipeline as number,
      })),
    });
  });

  app.get("/api/queue", async (req, reply) => {
    const query = querySchema.parse(req.query);
    const actor = await optionalOperator(req);
    const supervise = actor ? isMaster(actor) : false;
    const limit = parseLimit(query.limit);
    const cursorParts = decodeCursor(query.cursor);

    const values: unknown[] = [];
    const sellerTypeClause = sellerClause(query.sellerType, values);
    const workClause = scopeClause(query.scope ?? "untouched", actor?.id, supervise, values);
    const listClause = listFilterClause(query, values);
    const ativoClause = query.includeInactive ? "" : "AND f.ativo";

    let cursorClause = "";
    if (cursorParts) {
      const [score, untouched, id] = cursorParts as [number, number, number];
      values.push(score, untouched, id);
      cursorClause = `AND (
            COALESCE(f.score_total, -1) < $${values.length - 2}
            OR (COALESCE(f.score_total, -1) = $${values.length - 2}
                AND CASE WHEN f.ultimo_contato_em IS NULL THEN 1 ELSE 0 END < $${values.length - 1})
            OR (COALESCE(f.score_total, -1) = $${values.length - 2}
                AND CASE WHEN f.ultimo_contato_em IS NULL THEN 1 ELSE 0 END = $${values.length - 1}
                AND f.veiculo_id > $${values.length})
          )`;
    }
    values.push(limit);

    const { rows } = await pool.query(
      `SELECT f.*, vd.nome AS vendedor_nome, cv.telefone_e164 AS vendedor_telefone_e164, a.url AS anuncio_url
         FROM fila_do_dia f
         LEFT JOIN vendedores vd ON vd.id = f.vendedor_id
         LEFT JOIN contatos_vendedor cv ON cv.vendedor_id = vd.id
         LEFT JOIN anuncios a ON a.id = f.anuncio_id
        WHERE 1=1
        ${NOT_STOCK_SQL}
        ${NO_OPEN_DEAL_SQL}
        ${ativoClause}
        ${sellerTypeClause}
        ${workClause}
        ${listClause}
        ${cursorClause}
        ORDER BY COALESCE(f.score_total, -1) DESC,
                 CASE WHEN f.ultimo_contato_em IS NULL THEN 1 ELSE 0 END DESC,
                 f.veiculo_id ASC
        LIMIT $${values.length}`,
      values,
    );

    const items = rows.map(mapQueueRow);
    const last = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && last
        ? encodeCursor([
            Number(last.score_total ?? -1),
            last.ultimo_contato_em == null ? 1 : 0,
            Number(last.veiculo_id),
          ])
        : null;

    reply.send({ items, nextCursor });
  });
}

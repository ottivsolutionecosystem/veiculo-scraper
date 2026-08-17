import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { mapQueueRow } from "../lib/serialize.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  city: z.string().optional(),
  yearMin: z.coerce.number().optional(),
  yearMax: z.coerce.number().optional(),
  priceMaxCents: z.coerce.number().optional(),
  minFipeDiscountPct: z.coerce.number().optional(),
  transmission: z.string().optional(),
  onlyActive: z.coerce.boolean().optional(),
});

/** GET /api/vehicles/search — Busca (docs/API.md seção 2). Mesma origem
 * de /api/queue (fila_do_dia), sem o filtro implícito de estado. */
export async function searchRoutes(app: FastifyInstance) {
  app.get("/api/vehicles/search", async (req, reply) => {
    const q = querySchema.parse(req.query);
    const limit = parseLimit(q.limit);

    const conditions: string[] = [];
    const values: unknown[] = [];
    function push(sql: string, value: unknown) {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    }

    if (q.brand) push("marca = ?", q.brand);
    if (q.model) push("modelo ILIKE '%' || ? || '%'", q.model);
    if (q.city) push("cidade = ?", q.city);
    if (q.yearMin !== undefined) push("ano_modelo >= ?", q.yearMin);
    if (q.yearMax !== undefined) push("ano_modelo <= ?", q.yearMax);
    if (q.priceMaxCents !== undefined) push("preco <= ?", q.priceMaxCents);
    if (q.minFipeDiscountPct !== undefined) push("desconto_fipe_pct >= ?", q.minFipeDiscountPct);
    if (q.transmission) push("cambio = ?", q.transmission);
    if (q.onlyActive) conditions.push("ativo = true");

    const cursorParts = decodeCursor(q.cursor);
    if (cursorParts) {
      const [id] = cursorParts as [number];
      values.push(id);
      conditions.push(`veiculo_id > $${values.length}`);
    }
    values.push(limit);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM fila_do_dia ${where} ORDER BY veiculo_id ASC LIMIT $${values.length}`,
      values,
    );

    const items = rows.map(mapQueueRow);
    const last = rows[rows.length - 1];
    const nextCursor = rows.length === limit && last ? encodeCursor([Number(last.veiculo_id)]) : null;

    reply.send({ items, nextCursor });
  });
}

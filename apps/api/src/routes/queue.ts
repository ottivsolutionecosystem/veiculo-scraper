import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { mapQueueRow } from "../lib/serialize.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
});

/** GET /api/queue — Fila do dia (docs/API.md seção 1). Fonte: view
 * materializada fila_do_dia. Exclui descartado/perdido por padrão. */
export async function queueRoutes(app: FastifyInstance) {
  app.get("/api/queue", async (req, reply) => {
    const query = querySchema.parse(req.query);
    const limit = parseLimit(query.limit);
    const cursorParts = decodeCursor(query.cursor);

    const values: unknown[] = [];
    let cursorClause = "";
    if (cursorParts) {
      const [score, id] = cursorParts as [number, number];
      values.push(score, id);
      cursorClause = `AND (score_total < $${values.length - 1} OR (score_total = $${values.length - 1} AND veiculo_id > $${values.length}))`;
    }
    values.push(limit);

    const { rows } = await pool.query(
      `SELECT * FROM fila_do_dia
        WHERE estado NOT IN ('discarded', 'lost')
        ${cursorClause}
        ORDER BY score_total DESC NULLS LAST, veiculo_id ASC
        LIMIT $${values.length}`,
      values,
    );

    const items = rows.map(mapQueueRow);
    const last = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && last ? encodeCursor([Number(last.score_total ?? 0), Number(last.veiculo_id)]) : null;

    reply.send({ items, nextCursor });
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";

const listQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  action: z.string().optional(),
  author: z.string().optional(),
  targetType: z.string().optional(),
});

/** GET /api/audit — Auditoria (docs/API.md seção 11). Só as 3 ações da
 * seção 15.11 do SPEC aparecem aqui. */
export async function auditRoutes(app: FastifyInstance) {
  app.get("/api/audit", async (req, reply) => {
    const q = listQuery.parse(req.query);
    const limit = parseLimit(q.limit);
    const conditions: string[] = [];
    const values: unknown[] = [];
    function push(sql: string, value: unknown) {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    }
    if (q.action) push("acao = ?", q.action);
    if (q.author) push("autor = ?", q.author);
    if (q.targetType) push("alvo_tipo = ?", q.targetType);
    const cursorParts = decodeCursor(q.cursor);
    if (cursorParts) push("id < ?", (cursorParts as [number])[0]);
    values.push(limit);

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM auditoria ${where} ORDER BY id DESC LIMIT $${values.length}`,
      values,
    );
    const last = rows[rows.length - 1];
    reply.send({ items: rows, nextCursor: rows.length === limit && last ? encodeCursor([last.id]) : null });
  });
}

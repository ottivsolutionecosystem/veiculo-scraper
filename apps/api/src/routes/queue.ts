import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { mapQueueRow, unmapSellerType } from "../lib/serialize.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  sellerType: z.enum(["individual", "dealer"]).optional(),
});

/** GET /api/queue — Fila do dia (docs/API.md seção 1). Fonte: view
 * materializada fila_do_dia. Exclui descartado/perdido por padrão. */
export async function queueRoutes(app: FastifyInstance) {
  app.get("/api/queue", async (req, reply) => {
    const query = querySchema.parse(req.query);
    const limit = parseLimit(query.limit);
    const cursorParts = decodeCursor(query.cursor);

    const values: unknown[] = [];
    let sellerTypeClause = "";
    if (query.sellerType) {
      values.push(unmapSellerType(query.sellerType));
      sellerTypeClause = `AND f.tipo_anunciante = $${values.length}`;
    }

    let cursorClause = "";
    if (cursorParts) {
      const [score, id] = cursorParts as [number, number];
      values.push(score, id);
      cursorClause = `AND (f.score_total < $${values.length - 1} OR (f.score_total = $${values.length - 1} AND f.veiculo_id > $${values.length}))`;
    }
    values.push(limit);

    const { rows } = await pool.query(
      `SELECT f.*, vd.nome AS vendedor_nome, cv.telefone_e164 AS vendedor_telefone_e164
         FROM fila_do_dia f
         LEFT JOIN vendedores vd ON vd.id = f.vendedor_id
         LEFT JOIN contatos_vendedor cv ON cv.vendedor_id = vd.id
        WHERE f.estado NOT IN ('discarded', 'lost')
        ${sellerTypeClause}
        ${cursorClause}
        ORDER BY f.score_total DESC NULLS LAST, f.veiculo_id ASC
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

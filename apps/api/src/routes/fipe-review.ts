import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";

const listQuery = z.object({ cursor: z.string().optional(), limit: z.string().optional() });

/** GET /api/fipe-review — Revisão de match FIPE (docs/API.md seção 8).
 * Confiança nula ou entre 0.60 e 0.85 (índice parcial ix_veiculos_fipe_revisao). */
export async function fipeReviewRoutes(app: FastifyInstance) {
  app.get("/api/fipe-review", async (req, reply) => {
    const q = listQuery.parse(req.query);
    const limit = parseLimit(q.limit);
    const cursorParts = decodeCursor(q.cursor);
    const values: unknown[] = [];
    let cursorClause = "";
    if (cursorParts) {
      values.push((cursorParts as [number])[0]);
      cursorClause = `AND v.id > $${values.length}`;
    }
    values.push(limit);

    const { rows } = await pool.query(
      `SELECT v.id, v.fipe_confianca, v.fipe_candidatos, a.marca, a.modelo, a.versao, a.ano_modelo,
              a.preco, a.titulo_normalizado
         FROM veiculos v
         JOIN anuncios a ON a.id = v.anuncio_principal_id
        WHERE (v.fipe_confianca IS NULL OR v.fipe_confianca < 0.85)
          ${cursorClause}
        ORDER BY v.id ASC
        LIMIT $${values.length}`,
      values,
    );
    const last = rows[rows.length - 1];
    reply.send({ items: rows, nextCursor: rows.length === limit && last ? encodeCursor([last.id]) : null });
  });
}

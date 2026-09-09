import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { mapQueueRow, unmapSellerType } from "../lib/serialize.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  city: z.string().optional(),
  yearMin: z.coerce.number().optional(),
  yearMax: z.coerce.number().optional(),
  priceMaxCents: z.coerce.number().optional(),
  minFipeDiscountPct: z.coerce.number().optional(),
  transmission: z.string().optional(),
  includeInactive: z.coerce.boolean().optional(),
  priceChanged: z.coerce.boolean().optional(),
  sellerType: z.enum(["individual", "dealer"]).optional(),
});

/** GET /api/vehicles/search — estoque consignado (o que de fato entrou). */
export async function searchRoutes(app: FastifyInstance) {
  app.get("/api/vehicles/search", async (req, reply) => {
    const q = querySchema.parse(req.query);
    const limit = parseLimit(q.limit);

    const conditions: string[] = ["f.estado = 'acquired'"];
    const values: unknown[] = [];
    function push(sql: string, value: unknown) {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    }

    if (q.vehicleId !== undefined) push("f.veiculo_id = ?", q.vehicleId);
    if (q.brand) push("f.marca = ?", q.brand);
    if (q.model) push("f.modelo ILIKE '%' || ? || '%'", q.model);
    if (q.city) push("f.cidade = ?", q.city);
    if (q.yearMin !== undefined) push("f.ano_modelo >= ?", q.yearMin);
    if (q.yearMax !== undefined) push("f.ano_modelo <= ?", q.yearMax);
    if (q.priceMaxCents !== undefined) push("f.preco <= ?", q.priceMaxCents);
    if (q.minFipeDiscountPct !== undefined) push("f.desconto_fipe_pct >= ?", q.minFipeDiscountPct);
    if (q.transmission) push("f.cambio = ?", q.transmission);
    if (q.priceChanged) conditions.push("f.preco_variacao IS NOT NULL AND f.preco_variacao <> 0");
    if (q.sellerType) push("f.tipo_anunciante = ?", unmapSellerType(q.sellerType));
    if (!q.includeInactive) conditions.push("f.ativo");

    const cursorParts = decodeCursor(q.cursor);
    if (cursorParts) {
      const [score, id] = cursorParts as [number, number];
      values.push(score, id);
      conditions.push(`(
        COALESCE(f.score_total, -1) < $${values.length - 1}
        OR (COALESCE(f.score_total, -1) = $${values.length - 1} AND f.veiculo_id > $${values.length})
      )`);
    }
    values.push(limit);

    const where = `WHERE ${conditions.join(" AND ")}`;
    const { rows } = await pool.query(
      `SELECT f.*, vd.nome AS vendedor_nome, cv.telefone_e164 AS vendedor_telefone_e164, a.url AS anuncio_url
         FROM fila_do_dia f
         LEFT JOIN vendedores vd ON vd.id = f.vendedor_id
         LEFT JOIN contatos_vendedor cv ON cv.vendedor_id = vd.id
         LEFT JOIN anuncios a ON a.id = f.anuncio_id
         ${where}
        ORDER BY COALESCE(f.score_total, -1) DESC, f.veiculo_id ASC
        LIMIT $${values.length}`,
      values,
    );

    const items = rows.map(mapQueueRow);
    const last = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && last
        ? encodeCursor([Number(last.score_total ?? -1), Number(last.veiculo_id)])
        : null;

    reply.send({ items, nextCursor });
  });
}

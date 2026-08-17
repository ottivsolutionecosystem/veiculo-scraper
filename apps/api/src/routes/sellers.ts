import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
import { NotFoundError } from "../lib/http-errors.js";

const listQuery = z.object({ cursor: z.string().optional(), limit: z.string().optional() });
const patchBody = z.object({ muted: z.boolean().optional(), doNotDisturb: z.boolean().optional() });

/** GET/PATCH /api/sellers* — Vendedores (docs/API.md seção 7). Telefone
 * sempre mascarado; revelação é a única via de acesso ao dado bruto,
 * auditada. */
export async function sellerRoutes(app: FastifyInstance) {
  app.get("/api/sellers", async (req, reply) => {
    const q = listQuery.parse(req.query);
    const limit = parseLimit(q.limit);
    const cursorParts = decodeCursor(q.cursor);
    const values: unknown[] = [];
    let cursorClause = "";
    if (cursorParts) {
      values.push((cursorParts as [number])[0]);
      cursorClause = `AND vd.id > $${values.length}`;
    }
    values.push(limit);

    const { rows } = await pool.query(
      `SELECT vd.id, vd.nome, vd.mutado, vd.nao_perturbe,
              (SELECT count(*) FROM veiculos v WHERE v.vendedor_id = vd.id) AS total_anuncios
         FROM vendedores vd
        WHERE true ${cursorClause}
        ORDER BY vd.id ASC
        LIMIT $${values.length}`,
      values,
    );
    const last = rows[rows.length - 1];
    reply.send({ items: rows, nextCursor: rows.length === limit && last ? encodeCursor([last.id]) : null });
  });

  app.get("/api/sellers/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const { rows } = await pool.query("SELECT * FROM vendedores WHERE id = $1", [id]);
    if (!rows[0]) throw new NotFoundError("Vendedor não encontrado.");
    const { rows: vehicles } = await pool.query(
      `SELECT v.id, a.marca, a.modelo, a.ano_modelo, a.preco, a.km FROM veiculos v
         JOIN anuncios a ON a.id = v.anuncio_principal_id
        WHERE v.vendedor_id = $1`,
      [id],
    );
    reply.send({ seller: rows[0], vehicles });
  });

  app.patch("/api/sellers/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = patchBody.parse(req.body);
    const { rows } = await pool.query(
      `UPDATE vendedores SET
         mutado = COALESCE($2, mutado),
         nao_perturbe = COALESCE($3, nao_perturbe),
         atualizado_em = now()
       WHERE id = $1 RETURNING *`,
      [id, body.muted ?? null, body.doNotDisturb ?? null],
    );
    if (!rows[0]) throw new NotFoundError("Vendedor não encontrado.");
    if (body.muted !== undefined) {
      await pool.query(
        "INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe) VALUES ('mute_seller', 'api', 'seller', $1, $2)",
        [String(id), body.muted ? "Vendedor mutado" : "Vendedor desmutado"],
      );
    }
    reply.send(rows[0]);
  });

  app.post("/api/sellers/:id/reveal-contact", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const { rows } = await pool.query("SELECT telefone_e164 FROM contatos_vendedor WHERE vendedor_id = $1", [id]);
    if (!rows[0]) throw new NotFoundError("Contato não encontrado (pode ter expirado por TTL).");
    await pool.query(
      "INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe) VALUES ('reveal_contact', 'api', 'seller', $1, 'Contato revelado via API')",
      [String(id)],
    );
    reply.send({ phone: rows[0].telefone_e164 });
  });
}

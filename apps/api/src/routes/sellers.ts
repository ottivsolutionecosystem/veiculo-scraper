import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
import { mapSeller, mapListing, maskPhone } from "../lib/serialize.js";
import { ConflictError, NotFoundError } from "../lib/http-errors.js";
import { requireOperator } from "../lib/current-operator.js";
import { CONTACT_BLOCK_MESSAGE, contactBlockReason } from "../lib/contato.js";

const listQuery = z.object({ cursor: z.string().optional(), limit: z.string().optional() });
const patchBody = z.object({ muted: z.boolean().optional(), doNotDisturb: z.boolean().optional() });

const SELLER_SELECT = `
  SELECT vd.*, cv.telefone_e164,
         (SELECT count(*) FROM veiculos v WHERE v.vendedor_id = vd.id) AS total_anuncios,
         (SELECT max(i.criado_em) FROM interacoes i WHERE i.vendedor_id = vd.id) AS ultimo_contato_em
    FROM vendedores vd
    LEFT JOIN contatos_vendedor cv ON cv.vendedor_id = vd.id
`;

function toSeller(row: Record<string, unknown>) {
  const seller = mapSeller(row);
  seller.maskedPhone = maskPhone(row.telefone_e164 as string | null);
  return seller;
}

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
      `${SELLER_SELECT} WHERE true ${cursorClause} ORDER BY vd.id ASC LIMIT $${values.length}`,
      values,
    );
    const last = rows[rows.length - 1];
    reply.send({
      items: rows.map(toSeller),
      nextCursor: rows.length === limit && last ? encodeCursor([Number(last.id)]) : null,
    });
  });

  app.get("/api/sellers/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const { rows } = await pool.query(`${SELLER_SELECT} WHERE vd.id = $1`, [id]);
    if (!rows[0]) throw new NotFoundError("Vendedor não encontrado.");
    const { rows: vehicleRows } = await pool.query(
      `SELECT v.id AS veiculo_id, a.* FROM veiculos v
         JOIN anuncios a ON a.id = v.anuncio_principal_id
        WHERE v.vendedor_id = $1`,
      [id],
    );
    reply.send({
      seller: toSeller(rows[0]),
      vehicles: vehicleRows.map((r) => ({ vehicleId: Number(r.veiculo_id), listing: mapListing(r) })),
    });
  });

  app.patch("/api/sellers/:id", async (req, reply) => {
    const actor = await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    const body = patchBody.parse(req.body);
    const { rows } = await pool.query(
      `UPDATE vendedores SET
         mutado = COALESCE($2, mutado),
         nao_perturbe = COALESCE($3, nao_perturbe),
         atualizado_em = now()
       WHERE id = $1 RETURNING id`,
      [id, body.muted ?? null, body.doNotDisturb ?? null],
    );
    if (!rows[0]) throw new NotFoundError("Vendedor não encontrado.");
    if (body.muted !== undefined) {
      await pool.query(
        "INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe) VALUES ('mute_seller', $1, 'seller', $2, $3)",
        [actor.login, String(id), body.muted ? "Vendedor mutado" : "Vendedor desmutado"],
      );
    }
    const { rows: refreshed } = await pool.query(`${SELLER_SELECT} WHERE vd.id = $1`, [id]);
    reply.send(toSeller(refreshed[0]!));
  });

  app.post("/api/sellers/:id/reveal-contact", async (req, reply) => {
    const actor = await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    const { rows: sellerRows } = await pool.query(
      `SELECT vd.mutado, vd.nao_perturbe, cv.telefone_e164
         FROM vendedores vd
         LEFT JOIN contatos_vendedor cv ON cv.vendedor_id = vd.id
        WHERE vd.id = $1`,
      [id],
    );
    if (!sellerRows[0]) throw new NotFoundError("Vendedor não encontrado.");
    const block = contactBlockReason({
      muted: Boolean(sellerRows[0].mutado),
      doNotDisturb: Boolean(sellerRows[0].nao_perturbe),
      hasPhone: Boolean(sellerRows[0].telefone_e164),
    });
    if (block) throw new ConflictError(CONTACT_BLOCK_MESSAGE[block]);
    await pool.query(
      "INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe) VALUES ('reveal_contact', $1, 'seller', $2, 'Contato revelado')",
      [actor.login, String(id)],
    );
    reply.send({ phone: sellerRows[0].telefone_e164 });
  });
}

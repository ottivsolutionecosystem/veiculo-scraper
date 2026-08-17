import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool, withTransaction } from "../db.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
import { mapRequest, unmapChecklist } from "../lib/serialize.js";
import { ConflictError, NotFoundError, ValidationError } from "../lib/http-errors.js";

const listQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  state: z.string().optional(),
  branchId: z.string().optional(),
});
const createRequest = z.object({
  vehicleId: z.number(),
  branchId: z.number(),
  customerId: z.number().optional(),
  proposedAt: z.string(),
});
const checklistSchema = z.object({
  document: z.boolean(),
  spareKey: z.boolean(),
  manual: z.boolean(),
  inspection: z.boolean(),
  standardPhotos: z.boolean(),
  appraisal: z.boolean(),
});
const patchRequest = z.object({
  state: z.string().optional(),
  checklist: checklistSchema.optional(),
  lossReason: z.string().optional(),
  notes: z.string().optional(),
});

const REQUEST_SELECT = `
  SELECT s.*, a.marca, a.modelo, a.ano_modelo, a.preco, u.nome AS unidade_nome
    FROM solicitacoes_captacao s
    JOIN veiculos v ON v.id = s.veiculo_id
    JOIN anuncios a ON a.id = v.anuncio_principal_id
    JOIN unidades u ON u.id = s.unidade_id
`;

/** GET/POST/PATCH /api/requests — Solicitações (docs/API.md seção 6). */
export async function requestRoutes(app: FastifyInstance) {
  app.get("/api/requests", async (req, reply) => {
    const q = listQuery.parse(req.query);
    const limit = parseLimit(q.limit);
    const conditions: string[] = [];
    const values: unknown[] = [];
    function push(sql: string, value: unknown) {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    }
    if (q.state) push("s.estado = ?", q.state);
    if (q.branchId) push("s.unidade_id = ?", Number(q.branchId));
    const cursorParts = decodeCursor(q.cursor);
    if (cursorParts) push("s.id > ?", (cursorParts as [number])[0]);
    values.push(limit);

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(`${REQUEST_SELECT} ${where} ORDER BY s.id ASC LIMIT $${values.length}`, values);
    const last = rows[rows.length - 1];
    reply.send({
      items: rows.map(mapRequest),
      nextCursor: rows.length === limit && last ? encodeCursor([Number(last.id)]) : null,
    });
  });

  app.post("/api/requests", async (req, reply) => {
    const body = createRequest.parse(req.body);
    let insertedId = 0;

    await withTransaction(async (client) => {
      const { rows: openRows } = await client.query(
        `SELECT id FROM solicitacoes_captacao WHERE veiculo_id = $1 AND estado NOT IN ('closed', 'declined')`,
        [body.vehicleId],
      );
      if (openRows[0]) throw new ConflictError("Já existe uma solicitação em aberto para este veículo.");

      const { rows: vRows } = await client.query("SELECT vendedor_id FROM veiculos WHERE id = $1", [body.vehicleId]);
      if (!vRows[0]) throw new NotFoundError("Veículo não encontrado.");

      const { rows } = await client.query(
        `INSERT INTO solicitacoes_captacao (veiculo_id, vendedor_id, cliente_id, unidade_id, responsavel, data_hora_proposta, estado)
         VALUES ($1,$2,$3,$4,'api',$5,'requested') RETURNING id`,
        [body.vehicleId, vRows[0].vendedor_id, body.customerId ?? null, body.branchId, body.proposedAt],
      );
      insertedId = rows[0]!.id;
    });

    const { rows } = await pool.query(`${REQUEST_SELECT} WHERE s.id = $1`, [insertedId]);
    reply.status(201).send(mapRequest(rows[0]!));
  });

  app.patch("/api/requests/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = patchRequest.parse(req.body);
    const checklistPt = body.checklist ? unmapChecklist(body.checklist) : null;

    if (body.state === "closed") {
      const { rows } = await pool.query("SELECT checklist FROM solicitacoes_captacao WHERE id = $1", [id]);
      if (!rows[0]) throw new NotFoundError("Solicitação não encontrada.");
      const checklist = checklistPt ?? rows[0].checklist;
      const incomplete = Object.values(checklist).some((done) => !done);
      if (incomplete) throw new ValidationError("Não fecha sem checklist completo (seção 11 do SPEC).");
    }

    const { rows } = await pool.query(
      `UPDATE solicitacoes_captacao SET
         estado = COALESCE($2, estado),
         checklist = COALESCE($3, checklist),
         motivo_perda = COALESCE($4, motivo_perda),
         observacoes = COALESCE($5, observacoes),
         atualizado_em = now()
       WHERE id = $1 RETURNING id`,
      [id, body.state ?? null, checklistPt ? JSON.stringify(checklistPt) : null, body.lossReason ?? null, body.notes ?? null],
    );
    if (!rows[0]) throw new NotFoundError("Solicitação não encontrada.");

    const { rows: refreshed } = await pool.query(`${REQUEST_SELECT} WHERE s.id = $1`, [id]);
    reply.send(mapRequest(refreshed[0]!));
  });
}

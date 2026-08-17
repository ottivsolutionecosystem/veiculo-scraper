import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool, withTransaction } from "../db.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
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
const patchRequest = z.object({
  state: z.string().optional(),
  checklist: z.record(z.boolean()).optional(),
  lossReason: z.string().optional(),
  notes: z.string().optional(),
});

const CHECKLIST_KEYS = ["documento", "chaveReserva", "manual", "vistoria", "fotosPadronizadas", "avaliacao"];

/** GET/POST/PATCH /api/requests, GET /api/branches — Solicitações
 * (docs/API.md seção 6). */
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
    const { rows } = await pool.query(
      `SELECT s.*, a.marca, a.modelo, a.ano_modelo, a.preco, u.nome AS unidade_nome
         FROM solicitacoes_captacao s
         JOIN veiculos v ON v.id = s.veiculo_id
         JOIN anuncios a ON a.id = v.anuncio_principal_id
         JOIN unidades u ON u.id = s.unidade_id
         ${where}
        ORDER BY s.id ASC
        LIMIT $${values.length}`,
      values,
    );
    const last = rows[rows.length - 1];
    reply.send({ items: rows, nextCursor: rows.length === limit && last ? encodeCursor([last.id]) : null });
  });

  app.post("/api/requests", async (req, reply) => {
    const body = createRequest.parse(req.body);

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
         VALUES ($1,$2,$3,$4,'api',$5,'requested') RETURNING *`,
        [body.vehicleId, vRows[0].vendedor_id, body.customerId ?? null, body.branchId, body.proposedAt],
      );
      req.log.info({ requestId: rows[0].id }, "solicitação criada");
    });

    reply.status(201).send();
  });

  app.patch("/api/requests/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = patchRequest.parse(req.body);

    if (body.state === "closed") {
      const { rows } = await pool.query("SELECT checklist FROM solicitacoes_captacao WHERE id = $1", [id]);
      if (!rows[0]) throw new NotFoundError("Solicitação não encontrada.");
      const checklist = body.checklist ?? rows[0].checklist;
      const incomplete = CHECKLIST_KEYS.some((key) => !checklist[key]);
      if (incomplete) throw new ValidationError("Não fecha sem checklist completo (seção 11 do SPEC).");
    }

    const { rows } = await pool.query(
      `UPDATE solicitacoes_captacao SET
         estado = COALESCE($2, estado),
         checklist = COALESCE($3, checklist),
         motivo_perda = COALESCE($4, motivo_perda),
         observacoes = COALESCE($5, observacoes),
         atualizado_em = now()
       WHERE id = $1 RETURNING *`,
      [id, body.state ?? null, body.checklist ? JSON.stringify(body.checklist) : null, body.lossReason ?? null, body.notes ?? null],
    );
    if (!rows[0]) throw new NotFoundError("Solicitação não encontrada.");
    reply.send(rows[0]);
  });
}

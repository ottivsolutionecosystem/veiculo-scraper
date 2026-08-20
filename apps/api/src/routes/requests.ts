import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool, withTransaction, refreshFilaDoDia } from "../db.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
import { mapRequest, unmapChecklist } from "../lib/serialize.js";
import { ConflictError, NotFoundError, ValidationError } from "../lib/http-errors.js";
import { requireOperator } from "../lib/current-operator.js";
import { canClaim, isTratativaOverdue, needsVisitAt } from "../lib/consignacao.js";
import { lockFromRow, VEHICLE_LOCK_SQL } from "../lib/vehicle-lock.js";
import { applyParecer } from "../lib/apply-parecer.js";
import { isMaster } from "../lib/roles.js";

const listQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  state: z.string().optional(),
  branchId: z.string().optional(),
  open: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "true" || v === "1"),
});
const createRequest = z.object({
  vehicleId: z.number(),
  branchId: z.number(),
  customerId: z.number().optional(),
  proposedAt: z.string().optional(),
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
  proposedAt: z.string().optional(),
});
const parecerBody = z.object({
  consigned: z.boolean(),
  reason: z.string().optional(),
});

const REQUEST_SELECT = `
  SELECT s.*, a.marca, a.modelo, a.ano_modelo, a.preco, a.url AS anuncio_url, u.nome AS unidade_nome,
         v.travado_ate, v.consignador, v.consignador_id, v.desconto_fipe_pct,
         vd.mutado AS vendedor_mutado, vd.nao_perturbe AS vendedor_nao_perturbe,
         (cv.telefone_e164 IS NOT NULL) AS tem_telefone
    FROM solicitacoes_captacao s
    JOIN veiculos v ON v.id = s.veiculo_id
    JOIN anuncios a ON a.id = v.anuncio_principal_id
    JOIN unidades u ON u.id = s.unidade_id
    LEFT JOIN vendedores vd ON vd.id = COALESCE(s.vendedor_id, v.vendedor_id)
    LEFT JOIN contatos_vendedor cv ON cv.vendedor_id = vd.id
`;

/** GET/POST/PATCH /api/requests — Solicitações (docs/API.md seção 6). */
export async function requestRoutes(app: FastifyInstance) {
  app.get("/api/requests", async (req, reply) => {
    const actor = await requireOperator(req);
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
    if (q.open) conditions.push("s.estado NOT IN ('closed', 'declined', 'no_show')");
    if (!isMaster(actor)) {
      push("v.consignador_id = ?", actor.id);
    }
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
    const actor = await requireOperator(req);
    const body = createRequest.parse(req.body);
    let insertedId = 0;

    await withTransaction(async (client) => {
      const { rows: openRows } = await client.query(
        `SELECT id FROM solicitacoes_captacao WHERE veiculo_id = $1 AND estado NOT IN ('closed', 'declined', 'no_show')`,
        [body.vehicleId],
      );
      if (openRows[0]) throw new ConflictError("Já existe uma solicitação em aberto para este veículo.");

      const { rows: vRows } = await client.query(VEHICLE_LOCK_SQL, [body.vehicleId]);
      if (!vRows[0]) throw new NotFoundError("Veículo não encontrado.");
      if (
        !isMaster(actor) &&
        !canClaim(new Date(), lockFromRow(vRows[0]), actor.id)
      ) {
        throw new ConflictError(
          `Em contato com ${vRows[0].consignador ?? "outro consignador"}. Só quem está com o carro solicita.`,
        );
      }

      const { rows } = await client.query(
        `INSERT INTO solicitacoes_captacao (veiculo_id, vendedor_id, cliente_id, unidade_id, responsavel, data_hora_proposta, estado)
         VALUES ($1,$2,$3,$4,$5,$6,'requested') RETURNING id`,
        [
          body.vehicleId,
          vRows[0].vendedor_id,
          body.customerId ?? null,
          body.branchId,
          actor.login,
          body.proposedAt ?? null,
        ],
      );
      insertedId = rows[0]!.id;
    });

    const { rows } = await pool.query(`${REQUEST_SELECT} WHERE s.id = $1`, [insertedId]);
    reply.status(201).send(mapRequest(rows[0]!));
  });

  app.patch("/api/requests/:id", async (req, reply) => {
    const actor = await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    const body = patchRequest.parse(req.body);
    const checklistPt = body.checklist ? unmapChecklist(body.checklist) : null;

    const { rows: currentRows } = await pool.query(
      `SELECT s.*, v.travado_ate, v.consignador_id, v.consignador
         FROM solicitacoes_captacao s
         JOIN veiculos v ON v.id = s.veiculo_id
        WHERE s.id = $1`,
      [id],
    );
    const current = currentRows[0];
    if (!current) throw new NotFoundError("Solicitação não encontrada.");

    if (!isMaster(actor) && Number(current.consignador_id) !== actor.id) {
      throw new ConflictError("Só quem está com o carro avança a tratativa.");
    }

    const nextState = body.state ?? (current.estado as string);
    const visitAt = body.proposedAt
      ? new Date(body.proposedAt)
      : current.data_hora_proposta
        ? new Date(current.data_hora_proposta)
        : null;
    const lockedUntil = current.travado_ate ? new Date(current.travado_ate) : null;
    const agora = new Date();

    if (body.state && body.state !== current.estado) {
      if (isTratativaOverdue(agora, current.estado, lockedUntil, current.data_hora_proposta ? new Date(current.data_hora_proposta) : null)) {
        throw new ValidationError("Prazo vencido. Encerre com o parecer: consignou ou o motivo.");
      }
      if (needsVisitAt(body.state, visitAt)) {
        throw new ValidationError("Informe data e hora da visita à loja para ir a Agendado.");
      }
    }

    if (body.state === "closed" || body.state === "declined" || body.state === "no_show") {
      try {
        await withTransaction(async (client) => {
          await applyParecer(client, {
            requestId: id,
            vehicleId: Number(current.veiculo_id),
          actorLogin: actor.login,
          consigned: body.state === "closed",
            reason: body.lossReason ?? (body.state === "no_show" ? "Não compareceu" : null),
          });
        });
      } catch (err) {
        if (err instanceof Error && /motivo/.test(err.message)) {
          throw new ValidationError(err.message);
        }
        throw err;
      }
      refreshFilaDoDia();
      const { rows: refreshed } = await pool.query(`${REQUEST_SELECT} WHERE s.id = $1`, [id]);
      reply.send(mapRequest(refreshed[0]!));
      return;
    }

    const { rows } = await pool.query(
      `UPDATE solicitacoes_captacao SET
         estado = COALESCE($2, estado),
         checklist = COALESCE($3, checklist),
         motivo_perda = COALESCE($4, motivo_perda),
         observacoes = COALESCE($5, observacoes),
         data_hora_proposta = COALESCE($6, data_hora_proposta),
         atualizado_em = now()
       WHERE id = $1 RETURNING id, veiculo_id`,
      [
        id,
        body.state ?? null,
        checklistPt ? JSON.stringify(checklistPt) : null,
        body.lossReason ?? null,
        body.notes ?? null,
        body.proposedAt ?? null,
      ],
    );
    if (!rows[0]) throw new NotFoundError("Solicitação não encontrada.");

    if (nextState === "scheduled" && visitAt) {
      await pool.query("UPDATE veiculos SET travado_ate = $2, atualizado_em = now() WHERE id = $1", [
        Number(current.veiculo_id),
        visitAt,
      ]);
    }

    const { rows: refreshed } = await pool.query(`${REQUEST_SELECT} WHERE s.id = $1`, [id]);
    reply.send(mapRequest(refreshed[0]!));
  });

  app.post("/api/requests/:id/parecer", async (req, reply) => {
    const actor = await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    const body = parecerBody.parse(req.body);

    const { rows: currentRows } = await pool.query(
      `SELECT s.id, s.veiculo_id, s.estado, v.consignador_id, v.consignador
         FROM solicitacoes_captacao s
         JOIN veiculos v ON v.id = s.veiculo_id
        WHERE s.id = $1`,
      [id],
    );
    const current = currentRows[0];
    if (!current) throw new NotFoundError("Solicitação não encontrada.");
    if (["closed", "declined", "no_show"].includes(current.estado as string)) {
      throw new ConflictError("Esta tratativa já foi encerrada.");
    }
    if (!isMaster(actor) && Number(current.consignador_id) !== actor.id) {
      throw new ConflictError("Só quem está com o carro registra o parecer.");
    }

    try {
      await withTransaction(async (client) => {
        await applyParecer(client, {
          requestId: id,
          vehicleId: Number(current.veiculo_id),
          actorLogin: actor.login,
          consigned: body.consigned,
          reason: body.reason,
        });
      });
    } catch (err) {
      if (err instanceof Error && /motivo/.test(err.message)) {
        throw new ValidationError(err.message);
      }
      throw err;
    }

    refreshFilaDoDia();
    const { rows: refreshed } = await pool.query(`${REQUEST_SELECT} WHERE s.id = $1`, [id]);
    reply.send(mapRequest(refreshed[0]!));
  });
}

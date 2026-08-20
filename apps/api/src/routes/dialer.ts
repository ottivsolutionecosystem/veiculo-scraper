import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool, withTransaction, refreshFilaDoDia } from "../db.js";
import { mapQueueRow } from "../lib/serialize.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
import { ConflictError, NotFoundError, ValidationError } from "../lib/http-errors.js";
import { canClaim } from "../lib/consignacao.js";
import { lockFromRow, VEHICLE_LOCK_SQL } from "../lib/vehicle-lock.js";
import { requireOperator } from "../lib/current-operator.js";
import { recordCall } from "../jobs/record-call.js";

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  operator: z.string().optional(),
});
const callBody = z.object({
  outcome: z.enum([
    "no_answer",
    "not_interested",
    "thinking",
    "negotiating",
    "agreed_to_bring",
    "accepted_consign",
    "wants_cash",
    "unrealistic_price",
    "wrong_number",
  ]),
  durationSeconds: z.number().optional(),
  operator: z.string().optional(),
});

/** GET/POST /api/dialer/* — modo discagem da fila de consignação. */
export async function dialerRoutes(app: FastifyInstance) {
  app.get("/api/dialer/queue", async (req, reply) => {
    const q = querySchema.parse(req.query);
    const limit = parseLimit(q.limit);
    const cursorParts = decodeCursor(q.cursor);

    const { rows: cfgRows } = await pool.query(
      "SELECT cooldown_vendedor_horas FROM configuracoes ORDER BY versao DESC LIMIT 1",
    );
    const cooldownHoras = cfgRows[0]?.cooldown_vendedor_horas ?? 24;

    const values: unknown[] = [cooldownHoras];
    let cursorClause = "";
    if (cursorParts) {
      values.push((cursorParts as [number])[0]);
      cursorClause = `AND f.veiculo_id > $${values.length}`;
    }
    values.push(limit);

    const { rows } = await pool.query(
      `SELECT f.*, vd.nome AS vendedor_nome, cv.telefone_e164 AS vendedor_telefone_e164
         FROM fila_do_dia f
         LEFT JOIN vendedores vd ON vd.id = f.vendedor_id
         LEFT JOIN contatos_vendedor cv ON cv.vendedor_id = vd.id
        WHERE f.ativo
          AND f.estado NOT IN ('discarded', 'lost')
          AND f.ultimo_contato_em IS NULL
          AND (vd.id IS NULL OR (vd.mutado = false AND vd.nao_perturbe = false))
          AND NOT EXISTS (
            SELECT 1 FROM interacoes i
             WHERE i.vendedor_id IS NOT NULL AND i.vendedor_id = f.vendedor_id
               AND i.criado_em > now() - ($1 || ' hours')::interval
          )
          ${cursorClause}
        ORDER BY f.score_total DESC NULLS LAST, f.veiculo_id ASC
        LIMIT $${values.length}`,
      values,
    );

    const items = rows.map(mapQueueRow);
    const last = rows[rows.length - 1];
    const nextCursor = rows.length === limit && last ? encodeCursor([Number(last.veiculo_id)]) : null;
    reply.send({ items, nextCursor });
  });

  app.post("/api/vehicles/:id/calls", async (req, reply) => {
    const actor = await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    const body = callBody.parse(req.body);
    if (!body.outcome) throw new ValidationError("Resultado da ligação é obrigatório.");

    const { rows } = await pool.query(VEHICLE_LOCK_SQL, [id]);
    if (!rows[0]) throw new NotFoundError("Veículo não encontrado.");
    const agora = new Date();
    if (!canClaim(agora, lockFromRow(rows[0]), actor.id)) {
      throw new ConflictError(
        `Em contato com ${rows[0].consignador ?? "outro consignador"}. Peça a transferência se não for seguir.`,
      );
    }

    await withTransaction(async (client) => {
      await recordCall(client, {
        vehicleId: id,
        sellerId: rows[0].vendedor_id === null ? null : Number(rows[0].vendedor_id),
        outcome: body.outcome,
        operator: actor.name,
        operatorId: actor.id,
        channel: "phone",
        durationSeconds: body.durationSeconds,
      });
    });
    refreshFilaDoDia();
    reply.status(201).send();
  });
}

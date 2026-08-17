import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool, refreshFilaDoDia } from "../db.js";
import { mapQueueRow } from "../lib/serialize.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
import { NotFoundError, ValidationError } from "../lib/http-errors.js";

const querySchema = z.object({ cursor: z.string().optional(), limit: z.string().optional() });
const callBody = z.object({
  outcome: z.enum(["no_answer", "not_interested", "thinking", "negotiating", "agreed_to_bring", "wrong_number"]),
  durationSeconds: z.number().optional(),
});

const OUTCOME_TO_STATE: Record<string, string | undefined> = {
  agreed_to_bring: "negotiating",
  not_interested: "discarded",
  wrong_number: "discarded",
};

/** GET/POST /api/dialer/* — Discador (docs/API.md seção 4). Cooldown de
 * 24h por vendedor (configuracoes.cooldown_vendedor_horas) e "não
 * perturbe"/mutado excluem o vendedor da fila. */
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
         JOIN vendedores vd ON vd.id = f.vendedor_id
         LEFT JOIN contatos_vendedor cv ON cv.vendedor_id = vd.id
        WHERE f.estado IN ('new', 'interested')
          AND vd.mutado = false AND vd.nao_perturbe = false
          AND NOT EXISTS (
            SELECT 1 FROM interacoes i
             WHERE i.vendedor_id = f.vendedor_id
               AND i.criado_em > now() - ($1 || ' hours')::interval
          )
          ${cursorClause}
        ORDER BY f.veiculo_id ASC
        LIMIT $${values.length}`,
      values,
    );

    const items = rows.map(mapQueueRow);
    const last = rows[rows.length - 1];
    const nextCursor = rows.length === limit && last ? encodeCursor([Number(last.veiculo_id)]) : null;
    reply.send({ items, nextCursor });
  });

  app.post("/api/vehicles/:id/calls", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = callBody.parse(req.body);
    if (!body.outcome) throw new ValidationError("Resultado da ligação é obrigatório.");

    const { rows } = await pool.query("SELECT vendedor_id FROM veiculos WHERE id = $1", [id]);
    if (!rows[0]) throw new NotFoundError("Veículo não encontrado.");

    await pool.query(
      `INSERT INTO interacoes (veiculo_id, vendedor_id, canal, resultado, duracao_segundos, autor)
       VALUES ($1, $2, 'phone', $3, $4, 'api')`,
      [id, rows[0].vendedor_id, body.outcome, body.durationSeconds ?? null],
    );

    const newState = OUTCOME_TO_STATE[body.outcome];
    if (newState) {
      await pool.query("UPDATE veiculos SET estado = $2, atualizado_em = now() WHERE id = $1", [id, newState]);
      refreshFilaDoDia();
    }

    reply.status(201).send();
  });
}

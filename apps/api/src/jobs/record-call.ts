import type { PoolClient } from "pg";

import { effectOfOutcome, followUpAt, lockUntil, normalizeOutcome } from "../lib/consignacao.js";

/** Grava o resultado da ligação e atualiza o trabalho do veículo.
 * Sem isso a fila não sabe quem já foi tocado. */
export async function recordCall(
  client: PoolClient,
  input: {
    vehicleId: number;
    sellerId: number | null;
    outcome: string;
    operator: string;
    operatorId: number;
    channel: "phone" | "whatsapp";
    durationSeconds?: number | null;
    interactionId?: number | null;
    externalId?: string | null;
  },
): Promise<void> {
  const outcome = normalizeOutcome(input.outcome);
  const effect = effectOfOutcome(outcome);
  const agora = new Date();
  const follow = effect.followUpDays !== null ? followUpAt(agora, effect.followUpDays) : null;
  const lock = effect.state === "discarded" ? null : lockUntil(agora);

  if (input.interactionId) {
    await client.query(
      `UPDATE interacoes SET
          resultado = $2,
          duracao_segundos = COALESCE($3, duracao_segundos),
          encerrada_em = COALESCE(encerrada_em, now()),
          id_externo = COALESCE($4, id_externo)
        WHERE id = $1 AND veiculo_id = $5`,
      [
        input.interactionId,
        outcome,
        input.durationSeconds ?? null,
        input.externalId ?? null,
        input.vehicleId,
      ],
    );
  } else {
    await client.query(
      `INSERT INTO interacoes (veiculo_id, vendedor_id, canal, resultado, duracao_segundos, autor, encerrada_em, id_externo)
       VALUES ($1, $2, $3, $4, $5, $6, now(), $7)`,
      [
        input.vehicleId,
        input.sellerId,
        input.channel,
        outcome,
        input.durationSeconds ?? null,
        input.operator || "api",
        input.externalId ?? null,
      ],
    );
  }

  await client.query(
    `UPDATE veiculos SET
        estado = $2,
        motivo_descarte = COALESCE($3, motivo_descarte),
        consignador = $4,
        consignador_id = $5,
        travado_ate = $6,
        ultimo_contato_em = now(),
        follow_up_em = $7,
        atualizado_em = now()
      WHERE id = $1`,
    [
      input.vehicleId,
      effect.state,
      effect.discardReason,
      input.operator || null,
      input.operatorId,
      lock,
      follow,
    ],
  );

  await client.query(
    "INSERT INTO estados_veiculo (veiculo_id, estado, motivo, autor) VALUES ($1, $2, $3, $4)",
    [input.vehicleId, effect.state, effect.discardReason, input.operator || "api"],
  );
}

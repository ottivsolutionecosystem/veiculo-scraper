import type { PoolClient } from "pg";

import { effectOfParecer } from "./consignacao.js";

export async function applyParecer(
  client: PoolClient,
  input: {
    requestId: number;
    vehicleId: number;
    actorLogin: string;
    consigned: boolean;
    reason?: string | null;
  },
): Promise<void> {
  const effect = effectOfParecer(input.consigned, input.reason);

  await client.query(
    `UPDATE solicitacoes_captacao
        SET estado = $2, motivo_perda = $3, atualizado_em = now()
      WHERE id = $1`,
    [input.requestId, effect.requestState, effect.discardReason],
  );

  if (effect.clearOwner) {
    await client.query(
      `UPDATE veiculos SET
          estado = $2,
          motivo_descarte = $3,
          consignador = NULL,
          consignador_id = NULL,
          travado_ate = NULL,
          follow_up_em = NULL,
          atualizado_em = now()
        WHERE id = $1`,
      [input.vehicleId, effect.vehicleState, effect.discardReason],
    );
  } else {
    await client.query(
      `UPDATE veiculos SET
          estado = $2,
          motivo_descarte = NULL,
          atualizado_em = now()
        WHERE id = $1`,
      [input.vehicleId, effect.vehicleState],
    );
  }

  await client.query(
    "INSERT INTO estados_veiculo (veiculo_id, estado, motivo, autor) VALUES ($1, $2, $3, $4)",
    [input.vehicleId, effect.vehicleState, effect.discardReason, input.actorLogin],
  );
  await client.query(
    `INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe)
     VALUES ('parecer', $1, 'vehicle', $2, $3)`,
    [
      input.actorLogin,
      String(input.vehicleId),
      effect.clearOwner ? `devolveu: ${effect.discardReason}` : "consignou",
    ],
  );
}

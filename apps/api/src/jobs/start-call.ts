import type { PoolClient } from "pg";

import { CONTACT_BLOCK_MESSAGE, contactBlockReason } from "../lib/contato.js";
import { ConflictError, NotFoundError } from "../lib/http-errors.js";
import { createTelephonyProvider } from "../providers/telephony.js";

export async function startCall(
  client: PoolClient,
  input: {
    vehicleId: number;
    operatorLogin: string;
    operatorName: string;
  },
): Promise<{
  interactionId: number;
  phone: string;
  sellerId: number | null;
  channel: "phone" | "whatsapp";
  mode: "softphone" | "tel_link";
}> {
  const { rows } = await client.query(
    `SELECT v.id, v.vendedor_id, vd.mutado, vd.nao_perturbe, cv.telefone_e164
       FROM veiculos v
       LEFT JOIN vendedores vd ON vd.id = v.vendedor_id
       LEFT JOIN contatos_vendedor cv ON cv.vendedor_id = vd.id
      WHERE v.id = $1`,
    [input.vehicleId],
  );
  const row = rows[0];
  if (!row) throw new NotFoundError("Veículo não encontrado.");

  const sellerId = row.vendedor_id === null ? null : Number(row.vendedor_id);
  const phone = typeof row.telefone_e164 === "string" ? row.telefone_e164 : null;
  const block = contactBlockReason({
    muted: Boolean(row.mutado),
    doNotDisturb: Boolean(row.nao_perturbe),
    hasPhone: Boolean(phone),
  });
  if (block) throw new ConflictError(CONTACT_BLOCK_MESSAGE[block]);
  if (!phone) throw new ConflictError(CONTACT_BLOCK_MESSAGE.no_phone);

  const provider = createTelephonyProvider();
  const mode = provider.capabilities().mode;
  const channel = mode === "softphone" ? "whatsapp" : "phone";

  if (sellerId !== null) {
    await client.query(
      "INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe) VALUES ('reveal_contact', $1, 'seller', $2, 'Contato revelado para ligação')",
      [input.operatorLogin, String(sellerId)],
    );
  }

  const inserted = await client.query(
    `INSERT INTO interacoes (veiculo_id, vendedor_id, canal, resultado, autor, iniciada_em)
     VALUES ($1, $2, $3, NULL, $4, now())
     RETURNING id`,
    [input.vehicleId, sellerId, channel, input.operatorName || "api"],
  );

  return {
    interactionId: Number(inserted.rows[0]!.id),
    phone,
    sellerId,
    channel,
    mode,
  };
}

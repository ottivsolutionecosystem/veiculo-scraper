import { createHmac } from "node:crypto";
import type { PoolClient } from "pg";

/** Job `notify` (SPEC seção 13): payload JSON assinado HMAC-SHA256 no
 * header X-Signature, log de entrega em webhook_entregas. Retry com
 * backoff fica a cargo do BullMQ (attempts/backoff na fila, worker.ts). */
export async function notifyWebhooks(client: PoolClient, evento: string, payload: Record<string, unknown>): Promise<void> {
  const { rows: webhooks } = await client.query(
    "SELECT id, url, segredo FROM webhooks WHERE ativo = true AND eventos ? $1",
    [evento],
  );

  for (const webhook of webhooks) {
    const body = JSON.stringify(payload);
    const signature = createHmac("sha256", webhook.segredo).update(body).digest("hex");

    let statusHttp: number | null = null;
    let sucesso = false;
    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Signature": signature },
        body,
      });
      statusHttp = res.status;
      sucesso = res.ok;
    } catch {
      sucesso = false;
    }

    await client.query(
      `INSERT INTO webhook_entregas (webhook_id, evento, payload, status_http, sucesso)
       VALUES ($1, $2, $3, $4, $5)`,
      [webhook.id, evento, JSON.stringify(payload), statusHttp, sucesso],
    );
  }
}

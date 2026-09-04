import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool, withTransaction } from "../db.js";
import { env } from "../env.js";
import { requireOperator } from "../lib/current-operator.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../lib/http-errors.js";
import { deliveryIdFromHeaders, parseInboundTelephony } from "../lib/telephony-inbound.js";
import { canClaim } from "../lib/consignacao.js";
import { lockFromRow, VEHICLE_LOCK_SQL } from "../lib/vehicle-lock.js";
import { startCall } from "../jobs/start-call.js";
import { createTelephonyProvider } from "../providers/telephony.js";

const linkBody = z.object({ externalId: z.string().min(1) });

function webhookAuthorized(req: { headers: Record<string, unknown> }): boolean {
  if (!env.wavoipWebhookSecret) return true;
  const bearer = typeof req.headers.authorization === "string" ? req.headers.authorization.replace(/^Bearer\s+/i, "") : "";
  const headerSecret =
    (typeof req.headers["x-webhook-secret"] === "string" && req.headers["x-webhook-secret"]) ||
    (typeof req.headers["x-wavoip-secret"] === "string" && req.headers["x-wavoip-secret"]) ||
    bearer;
  return headerSecret === env.wavoipWebhookSecret;
}

/** Sessão do softphone, start da ligação, vínculo do id externo, webhook
 * inbound e proxy da gravação. A UI não conhece o fornecedor. */
export async function telephonyRoutes(app: FastifyInstance) {
  app.get("/api/telephony/session", async (req, reply) => {
    await requireOperator(req);
    const provider = createTelephonyProvider();
    const token = provider.sessionToken();
    reply.send({
      mode: provider.capabilities().mode,
      ...(token ? { token } : {}),
    });
  });

  app.post("/api/vehicles/:id/calls/start", async (req, reply) => {
    const actor = await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    const { rows } = await pool.query(VEHICLE_LOCK_SQL, [id]);
    if (!rows[0]) throw new NotFoundError("Veículo não encontrado.");
    if (!canClaim(new Date(), lockFromRow(rows[0]), actor.id)) {
      throw new ConflictError(
        `Em contato com ${rows[0].consignador ?? "outro consignador"}. Peça a transferência se não for seguir.`,
      );
    }

    const started = await withTransaction((client) =>
      startCall(client, {
        vehicleId: id,
        operatorLogin: actor.login,
        operatorName: actor.name,
      }),
    );
    reply.status(201).send({
      interactionId: started.interactionId,
      mode: started.mode,
      phone: started.phone,
      channel: started.channel,
    });
  });

  app.post("/api/interactions/:id/external", async (req, reply) => {
    await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    const body = linkBody.parse(req.body);
    const { rows } = await pool.query(
      `UPDATE interacoes SET id_externo = COALESCE(id_externo, $2)
        WHERE id = $1
        RETURNING id`,
      [id, body.externalId],
    );
    if (!rows[0]) throw new NotFoundError("Ligação não encontrada.");
    reply.status(204).send();
  });

  app.get("/api/interactions/:id/recording", async (req, reply) => {
    await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    const { rows } = await pool.query(
      "SELECT gravacao_url, gravacao_id FROM interacoes WHERE id = $1",
      [id],
    );
    if (!rows[0]) throw new NotFoundError("Ligação não encontrada.");
    const provider = createTelephonyProvider();
    const stored = typeof rows[0].gravacao_url === "string" ? rows[0].gravacao_url : null;
    const fromId = typeof rows[0].gravacao_id === "string" ? provider.recordingUrl(rows[0].gravacao_id) : null;
    const url = stored || fromId;
    if (!url) throw new NotFoundError("Gravação ainda não disponível.");

    const upstream = await fetch(url);
    if (!upstream.ok) throw new NotFoundError("Gravação indisponível.");
    const contentType = upstream.headers.get("content-type") ?? "audio/mpeg";
    const body = Buffer.from(await upstream.arrayBuffer());
    reply.header("Content-Type", contentType);
    reply.header("Cache-Control", "private, max-age=300");
    return reply.send(body);
  });

  app.post("/api/telephony/inbound", async (req, reply) => {
    if (!webhookAuthorized(req as { headers: Record<string, unknown> })) {
      throw new UnauthorizedError("Webhook recusado.");
    }

    const headers = req.headers as Record<string, unknown>;
    const deliveryId = deliveryIdFromHeaders(headers);
    if (deliveryId) {
      const inserted = await pool.query(
        `INSERT INTO telefonia_entregas (delivery_id) VALUES ($1)
         ON CONFLICT (delivery_id) DO NOTHING
         RETURNING delivery_id`,
        [deliveryId],
      );
      if (!inserted.rows[0]) {
        reply.status(200).send({ ok: true, duplicate: true });
        return;
      }
    }

    const event = parseInboundTelephony(req.body);
    if (!event) {
      reply.status(200).send({ ok: true, ignored: true });
      return;
    }

    if (event.kind === "call") {
      await pool.query(
        `UPDATE interacoes SET
            id_externo = COALESCE(id_externo, $1),
            duracao_segundos = COALESCE($2, duracao_segundos),
            encerrada_em = CASE WHEN $3 THEN COALESCE(encerrada_em, now()) ELSE encerrada_em END
          WHERE id_externo = $1`,
        [event.externalId, event.durationSeconds, event.status === "ended"],
      );
    } else if (event.ready) {
      await pool.query(
        `UPDATE interacoes SET
            id_externo = COALESCE(id_externo, $1),
            gravacao_id = COALESCE(gravacao_id, $1),
            gravacao_url = COALESCE($2, gravacao_url)
          WHERE id_externo = $1`,
        [event.externalId, event.recordUrl],
      );
    }

    reply.status(200).send({ ok: true });
  });
}

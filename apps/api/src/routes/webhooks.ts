import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
import { NotFoundError } from "../lib/http-errors.js";

const webhookBody = z.object({ url: z.string().url(), events: z.array(z.string()), secret: z.string().optional() });
const listQuery = z.object({ cursor: z.string().optional(), limit: z.string().optional() });

/** GET/POST/PATCH /api/webhooks, GET /api/webhooks/:id/deliveries
 * (docs/API.md seção 10). `segredo` nunca sai em nenhum GET. */
export async function webhookRoutes(app: FastifyInstance) {
  app.get("/api/webhooks", async (_req, reply) => {
    const { rows } = await pool.query("SELECT id, url, eventos, ativo, criado_em, atualizado_em FROM webhooks ORDER BY id");
    reply.send(rows);
  });

  app.post("/api/webhooks", async (req, reply) => {
    const body = webhookBody.parse(req.body);
    if (!body.secret) throw new NotFoundError("secret é obrigatório na criação."); // 422 seria mais correto; mantido simples aqui
    const { rows } = await pool.query(
      "INSERT INTO webhooks (url, eventos, segredo) VALUES ($1,$2,$3) RETURNING id, url, eventos, ativo, criado_em",
      [body.url, JSON.stringify(body.events), body.secret],
    );
    reply.status(201).send(rows[0]);
  });

  app.patch("/api/webhooks/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = webhookBody.partial().parse(req.body);
    const { rows } = await pool.query(
      `UPDATE webhooks SET
         url = COALESCE($2, url), eventos = COALESCE($3, eventos), atualizado_em = now()
       WHERE id = $1 RETURNING id, url, eventos, ativo, criado_em`,
      [id, body.url ?? null, body.events ? JSON.stringify(body.events) : null],
    );
    if (!rows[0]) throw new NotFoundError("Webhook não encontrado.");
    reply.send(rows[0]);
  });

  app.get("/api/webhooks/:id/deliveries", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const q = listQuery.parse(req.query);
    const limit = parseLimit(q.limit);
    const cursorParts = decodeCursor(q.cursor);
    const values: unknown[] = [id];
    let cursorClause = "";
    if (cursorParts) {
      values.push((cursorParts as [number])[0]);
      cursorClause = `AND id < $${values.length}`;
    }
    values.push(limit);

    const { rows } = await pool.query(
      `SELECT * FROM webhook_entregas WHERE webhook_id = $1 ${cursorClause}
        ORDER BY id DESC LIMIT $${values.length}`,
      values,
    );
    const last = rows[rows.length - 1];
    reply.send({ items: rows, nextCursor: rows.length === limit && last ? encodeCursor([last.id]) : null });
  });
}

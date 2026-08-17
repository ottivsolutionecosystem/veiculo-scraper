import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { NotFoundError } from "../lib/http-errors.js";

const branchBody = z.object({ name: z.string(), address: z.string(), intakeLimitPerPeriod: z.number() });

/** GET/POST/PATCH /api/branches — usada em Solicitações e Ajustes
 * (docs/API.md seções 6 e 10). */
export async function branchRoutes(app: FastifyInstance) {
  app.get("/api/branches", async (_req, reply) => {
    const { rows } = await pool.query(`
      SELECT u.*, (
        SELECT count(*) FROM solicitacoes_captacao s
         WHERE s.unidade_id = u.id
           AND s.data_hora_proposta >= date_trunc('month', now())
           AND s.estado NOT IN ('closed', 'declined')
      ) AS solicitacoes_no_periodo
      FROM unidades u ORDER BY u.id
    `);
    reply.send(rows);
  });

  app.post("/api/branches", async (req, reply) => {
    const body = branchBody.parse(req.body);
    const { rows } = await pool.query(
      "INSERT INTO unidades (nome, endereco, limite_veiculos_por_periodo) VALUES ($1,$2,$3) RETURNING *",
      [body.name, body.address, body.intakeLimitPerPeriod],
    );
    reply.status(201).send(rows[0]);
  });

  app.patch("/api/branches/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = branchBody.partial().parse(req.body);
    const { rows } = await pool.query(
      `UPDATE unidades SET
         nome = COALESCE($2, nome), endereco = COALESCE($3, endereco),
         limite_veiculos_por_periodo = COALESCE($4, limite_veiculos_por_periodo)
       WHERE id = $1 RETURNING *`,
      [id, body.name, body.address, body.intakeLimitPerPeriod],
    );
    if (!rows[0]) throw new NotFoundError("Unidade não encontrada.");
    reply.send(rows[0]);
  });
}

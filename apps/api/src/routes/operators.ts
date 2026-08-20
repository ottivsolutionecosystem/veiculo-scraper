import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { requireMaster, requireOperator } from "../lib/current-operator.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/http-errors.js";
import { hashPassword } from "../lib/password.js";
import { isMasterLogin, type OperatorRole } from "../lib/roles.js";

const createBody = z.object({
  name: z.string().min(2).max(80),
  login: z.string().min(3).max(32).regex(/^[a-zA-Z0-9._]+$/),
  password: z.string().min(6).max(128),
});
const patchBody = z.object({
  active: z.boolean(),
});

function mapRow(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    name: r.nome as string,
    login: r.login as string,
    role: r.papel as OperatorRole,
    active: Boolean(r.ativo),
  };
}

/** GET/POST /api/operators — só o master autoriza quem entra. */
export async function operatorRoutes(app: FastifyInstance) {
  app.get("/api/operators", async (req, reply) => {
    await requireOperator(req);
    const { rows } = await pool.query(
      `SELECT id, nome, login, papel, ativo, criado_em
         FROM operadores
        ORDER BY (papel = 'master') DESC, nome ASC, id ASC`,
    );
    reply.send({ items: rows.map(mapRow) });
  });

  app.post("/api/operators", async (req, reply) => {
    const actor = await requireMaster(req);
    const body = createBody.parse(req.body);
    const login = body.login.trim().toLowerCase();
    if (isMasterLogin(login)) {
      throw new ForbiddenError("Não dá para cadastrar outro master.");
    }
    const senhaHash = await hashPassword(body.password);
    try {
      const { rows } = await pool.query(
        `INSERT INTO operadores (nome, login, senha_hash, papel)
         VALUES ($1, $2, $3, 'consignador')
         RETURNING id, nome, login, papel, ativo`,
        [body.name.trim(), login, senhaHash],
      );
      const row = rows[0]!;
      await pool.query(
        `INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe)
         VALUES ('create_operator', $1, 'operator', $2, $3)`,
        [actor.login, String(row.id), row.login],
      );
      reply.status(201).send(mapRow(row));
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "23505") throw new ConflictError("Este usuário já existe.");
      throw err;
    }
  });

  app.patch("/api/operators/:id", async (req, reply) => {
    const actor = await requireMaster(req);
    const id = Number((req.params as { id: string }).id);
    const body = patchBody.parse(req.body);
    const { rows } = await pool.query(
      "SELECT id, nome, login, papel, ativo FROM operadores WHERE id = $1",
      [id],
    );
    if (!rows[0]) throw new NotFoundError("Consignador não encontrado.");
    if (rows[0].papel === "master") {
      throw new ForbiddenError("O acesso do master não pode ser desligado.");
    }
    const { rows: updated } = await pool.query(
      `UPDATE operadores SET ativo = $2 WHERE id = $1
       RETURNING id, nome, login, papel, ativo`,
      [id, body.active],
    );
    await pool.query(
      `INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe)
       VALUES ('authorize_operator', $1, 'operator', $2, $3)`,
      [actor.login, String(id), body.active ? `liberou ${rows[0].login}` : `removeu ${rows[0].login}`],
    );
    reply.send(mapRow(updated[0]!));
  });
}

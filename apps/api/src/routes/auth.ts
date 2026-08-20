import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { env } from "../env.js";
import { mapOperator, optionalOperator, requireOperator, SESSION_COOKIE } from "../lib/current-operator.js";
import { ConflictError, ForbiddenError, UnauthorizedError, ValidationError } from "../lib/http-errors.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { isMasterLogin, MASTER_LOGIN, type OperatorRole } from "../lib/roles.js";
import { sessionCookieFlags } from "../lib/cookie-flags.js";
import { signSession } from "../lib/session.js";

const credentials = z.object({
  login: z.string().min(3).max(32).regex(/^[a-zA-Z0-9._]+$/),
  password: z.string().min(6).max(128),
});
const setupBody = credentials.extend({
  name: z.string().min(2).max(80),
});

function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${sessionCookieFlags(env.webOrigin)}`;
}

function clearCookie(): string {
  const secure = env.webOrigin.startsWith("https://") ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}

/** GET/POST /api/auth/* — identidade do consignador. */
export async function authRoutes(app: FastifyInstance) {
  app.get("/api/auth/status", async (_req, reply) => {
    const { rows } = await pool.query(
      "SELECT 1 FROM operadores WHERE papel = 'master' LIMIT 1",
    );
    reply.send({ needsSetup: rows.length === 0, masterLogin: MASTER_LOGIN });
  });

  app.get("/api/auth/me", async (req, reply) => {
    const operator = await requireOperator(req);
    reply.send({ operator: mapOperator(operator) });
  });

  app.post("/api/auth/setup", async (req, reply) => {
    const body = setupBody.parse(req.body);
    const login = normalizeLogin(body.login);
    if (!isMasterLogin(login)) {
      throw new ForbiddenError(`O primeiro acesso é só do master (${MASTER_LOGIN}).`);
    }
    const { rows: existing } = await pool.query(
      "SELECT id FROM operadores WHERE papel = 'master' LIMIT 1",
    );
    if (existing[0]) {
      throw new ConflictError("O master já existe. Entre com o seu usuário.");
    }
    const senhaHash = await hashPassword(body.password);
    const inserted = await pool.query(
      `INSERT INTO operadores (nome, login, senha_hash, papel)
       VALUES ($1, $2, $3, 'master')
       RETURNING id, nome, login, papel, ativo`,
      [body.name.trim(), login, senhaHash],
    );
    const row = inserted.rows[0]!;
    const operator = {
      id: Number(row.id),
      name: row.nome as string,
      login: row.login as string,
      role: row.papel as OperatorRole,
      active: Boolean(row.ativo),
    };
    const token = signSession(operator.id, env.sessionSecret);
    reply.header("Set-Cookie", sessionCookie(token));
    reply.status(201).send({ token, operator: mapOperator(operator) });
  });

  app.post("/api/auth/login", async (req, reply) => {
    const body = credentials.parse(req.body);
    const login = normalizeLogin(body.login);
    const { rows } = await pool.query(
      "SELECT id, nome, login, senha_hash, papel, ativo FROM operadores WHERE login = $1",
      [login],
    );
    const row = rows[0];
    if (!row || !row.ativo) throw new UnauthorizedError("Usuário ou senha inválidos.");
    const ok = await verifyPassword(body.password, row.senha_hash as string);
    if (!ok) throw new UnauthorizedError("Usuário ou senha inválidos.");
    const operator = {
      id: Number(row.id),
      name: row.nome as string,
      login: row.login as string,
      role: row.papel as OperatorRole,
      active: true,
    };
    const token = signSession(operator.id, env.sessionSecret);
    reply.header("Set-Cookie", sessionCookie(token));
    reply.send({ token, operator: mapOperator(operator) });
  });

  app.post("/api/auth/logout", async (req, reply) => {
    await optionalOperator(req);
    reply.header("Set-Cookie", clearCookie());
    reply.status(204).send();
  });

  app.post("/api/auth/change-password", async (req, reply) => {
    const operator = await requireOperator(req);
    const body = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6).max(128),
    }).parse(req.body);
    const { rows } = await pool.query("SELECT senha_hash FROM operadores WHERE id = $1", [operator.id]);
    if (!rows[0]) throw new UnauthorizedError();
    const ok = await verifyPassword(body.currentPassword, rows[0].senha_hash as string);
    if (!ok) throw new ValidationError("Senha atual não confere.");
    const next = await hashPassword(body.newPassword);
    await pool.query("UPDATE operadores SET senha_hash = $2 WHERE id = $1", [operator.id, next]);
    reply.status(204).send();
  });
}

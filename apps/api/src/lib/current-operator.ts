import type { FastifyRequest } from "fastify";

import { pool } from "../db.js";
import { env } from "../env.js";
import { UnauthorizedError, ForbiddenError } from "./http-errors.js";
import { cookieFromHeader, readSession } from "./session.js";
import { isMaster, type OperatorRole } from "./roles.js";

export const SESSION_COOKIE = "vs_sessao";

export interface CurrentOperator {
  id: number;
  name: string;
  login: string;
  role: OperatorRole;
  active: boolean;
}

function tokenFromRequest(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const bearer = header.slice(7).trim();
    if (bearer) return bearer;
  }
  return cookieFromHeader(req.headers.cookie, SESSION_COOKIE);
}

export async function optionalOperator(req: FastifyRequest): Promise<CurrentOperator | null> {
  const token = tokenFromRequest(req);
  if (!token) return null;
  const id = readSession(token, env.sessionSecret);
  if (!id) return null;
  const { rows } = await pool.query(
    "SELECT id, nome, login, papel, ativo FROM operadores WHERE id = $1",
    [id],
  );
  const row = rows[0];
  if (!row || !row.ativo) return null;
  return {
    id: Number(row.id),
    name: row.nome as string,
    login: row.login as string,
    role: row.papel as OperatorRole,
    active: true,
  };
}

export async function requireOperator(req: FastifyRequest): Promise<CurrentOperator> {
  const operator = await optionalOperator(req);
  if (!operator) throw new UnauthorizedError();
  return operator;
}

export async function requireMaster(req: FastifyRequest): Promise<CurrentOperator> {
  const operator = await requireOperator(req);
  if (!isMaster(operator)) {
    throw new ForbiddenError("Só o master autoriza quem pode entrar.");
  }
  return operator;
}

export function mapOperator(op: CurrentOperator) {
  return { id: op.id, name: op.name, login: op.login, role: op.role, active: op.active };
}

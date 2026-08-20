/**
 * Cria ou atualiza o operador bootstrap (login/senha via env).
 * Uso: npm run seed:admin --workspace=apps/api
 *      SEED_ADMIN_LOGIN=admin SEED_ADMIN_PASSWORD=123456 npm run seed:admin --workspace=apps/api
 *
 * A tela de login exige senha com no mínimo 6 caracteres (auth.ts).
 */
import { Pool } from "pg";

import { env } from "../src/env.js";
import { hashPassword } from "../src/lib/password.js";

const LOGIN = (process.env.SEED_ADMIN_LOGIN ?? "admin").trim().toLowerCase();
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "123";
const NAME = process.env.SEED_ADMIN_NAME ?? "Administrador";
const ROLE = process.env.SEED_ADMIN_ROLE ?? "master";

async function main() {
  if (PASSWORD.length < 6) {
    console.warn(
      "Aviso: senha com menos de 6 caracteres não funciona no login da UI. Use SEED_ADMIN_PASSWORD=123456 ou similar.",
    );
  }

  const pool = new Pool({ connectionString: env.databaseUrl });
  const senhaHash = await hashPassword(PASSWORD);

  try {
    const existing = await pool.query<{ id: number }>(
      "SELECT id FROM operadores WHERE login = $1",
      [LOGIN],
    );

    if (existing.rows[0]) {
      await pool.query(
        `UPDATE operadores
         SET nome = $2, senha_hash = $3, papel = $4, ativo = true
         WHERE id = $1`,
        [existing.rows[0].id, NAME.trim(), senhaHash, ROLE],
      );
      console.log(`operador "${LOGIN}" atualizado (papel=${ROLE}).`);
    } else {
      await pool.query(
        `INSERT INTO operadores (nome, login, senha_hash, papel, ativo)
         VALUES ($1, $2, $3, $4, true)`,
        [NAME.trim(), LOGIN, senhaHash, ROLE],
      );
      console.log(`operador "${LOGIN}" criado (papel=${ROLE}).`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

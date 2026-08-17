import { Pool } from "pg";

import { env } from "./env.js";

export const pool = new Pool({ connectionString: env.databaseUrl });

/** `fila_do_dia` é materializada (db/migrations/0011) — mudança de estado
 * (descarte, resultado de ligação) só aparece na fila depois de um refresh.
 * O worker roda isso a cada 10 min (SPEC); as rotas chamam a versão
 * fire-and-forget pros casos que o operador espera ver sumir da lista na
 * hora, sem atrasar a resposta HTTP. */
export async function refreshFilaDoDiaAsync(): Promise<void> {
  await pool.query("REFRESH MATERIALIZED VIEW CONCURRENTLY fila_do_dia");
}

export function refreshFilaDoDia(): void {
  refreshFilaDoDiaAsync().catch((err) => {
    console.error("refresh fila_do_dia falhou:", err);
  });
}

export async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

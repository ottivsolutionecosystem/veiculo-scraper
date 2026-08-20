/**
 * Aplica db/schema.sql e db/migrations/*.sql em ordem, registrando o que já
 * rodou em `schema_migrations`. Reaplicar é seguro: arquivo registrado é
 * pulado, e os próprios arquivos usam IF NOT EXISTS.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

import { env } from "../src/env.js";

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "db", "schema.sql"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("não achei db/schema.sql a partir de " + start);
}

const repoRoot = findRepoRoot(dirname(fileURLToPath(import.meta.url)));

async function main() {
  const pool = new Pool({ connectionString: env.databaseUrl });
  const migrationsDir = join(repoRoot, "db", "migrations");
  const files = [
    join(repoRoot, "db", "schema.sql"),
    ...readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((name) => join(migrationsDir, name)),
  ];

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      arquivo     text PRIMARY KEY,
      aplicado_em timestamptz NOT NULL DEFAULT now()
    )
  `);
  const { rows: applied } = await pool.query<{ arquivo: string }>("SELECT arquivo FROM schema_migrations");
  const done = new Set(applied.map((r) => r.arquivo));

  for (const file of files) {
    const relative = file.slice(repoRoot.length + 1).replace(/\\/g, "/");
    if (done.has(relative)) {
      console.log(`pulando ${relative} (já aplicado)`);
      continue;
    }
    process.stdout.write(`aplicando ${relative}... `);
    await pool.query(readFileSync(file, "utf8"));
    await pool.query("INSERT INTO schema_migrations (arquivo) VALUES ($1) ON CONFLICT DO NOTHING", [relative]);
    console.log("ok");
  }

  await pool.end();
  console.log("migrations ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

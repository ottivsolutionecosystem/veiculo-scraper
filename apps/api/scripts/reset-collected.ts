/**
 * Apaga anúncios/veículos coletados. Mantém FIPE, fontes e configuração.
 * Depois rode a coleta / ingestão de novo — dados misturados não se
 * corrigem no lugar.
 */
import { Pool } from "pg";

import { env } from "../src/env.js";
import { resetCollectedData } from "../src/lib/reset-collected.js";

const pool = new Pool({ connectionString: env.databaseUrl });

async function main() {
  await resetCollectedData(pool);
  console.log("reset ok: 0 anúncios, 0 veículos. FIPE, fontes e config mantidos.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.stderr.write(String(err instanceof Error ? err.stack ?? err.message : err));
  process.exit(1);
});

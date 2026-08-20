/**
 * Apaga anúncios/veículos coletados. Mantém FIPE, fontes e configuração.
 * Depois rode a coleta de particular de novo — dados misturados não se
 * corrigem no lugar.
 */
import { Pool } from "pg";

import { env } from "../src/env.js";

const pool = new Pool({ connectionString: env.databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      TRUNCATE
        anuncios, veiculos, anuncio_veiculo, preco_historico,
        scores, estados_veiculo, interacoes,
        contatos_vendedor, vendedores,
        matches_interesse, solicitacoes_captacao,
        scrape_runs, execucoes_solicitadas
      RESTART IDENTITY CASCADE
    `);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  await pool.query("REFRESH MATERIALIZED VIEW fila_do_dia");
  console.log("reset ok: 0 anúncios, 0 veículos. FIPE, fontes e config mantidos.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.stderr.write(String(err instanceof Error ? err.stack ?? err.message : err));
  process.exit(1);
});

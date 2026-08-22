/**
 * Promove anúncios órfãos (sem linha em anuncio_veiculo) a veículos.
 * Use quando o coletor gravou em `anuncios` mas o worker BullMQ não processou.
 *
 * Rode na api ou no work (mesmo DATABASE_URL):
 *   npm run bootstrap-normalize --workspace=apps/api
 */
import { Pool } from "pg";

import { env } from "../src/env.js";
import { normalizeAnuncio } from "../src/jobs/normalize.js";
import { matchFipeForVehicle } from "../src/jobs/match-fipe.js";
import { calculateScoreForVehicle } from "../src/jobs/score.js";

const pool = new Pool({ connectionString: env.databaseUrl });

async function main() {
  const client = await pool.connect();
  let ok = 0;
  let falhas = 0;

  try {
    const { rows } = await client.query<{ id: number }>(
      `SELECT a.id FROM anuncios a
         LEFT JOIN anuncio_veiculo av ON av.anuncio_id = a.id
        WHERE av.anuncio_id IS NULL
        ORDER BY a.id`,
    );
    console.log(`${rows.length} anúncio(s) sem veículo`);

    for (const row of rows) {
      try {
        const { veiculoId } = await normalizeAnuncio(client, row.id);
        await matchFipeForVehicle(client, veiculoId);
        await calculateScoreForVehicle(client, veiculoId);
        ok += 1;
        if (ok % 100 === 0) console.log(`… ${ok}/${rows.length}`);
      } catch (err) {
        falhas += 1;
        console.warn(`anúncio ${row.id}:`, err);
      }
    }
  } finally {
    client.release();
  }

  console.log(`normalize: ${ok} ok, ${falhas} falha(s)`);
  await pool.query("REFRESH MATERIALIZED VIEW CONCURRENTLY fila_do_dia");
  const { rows: fila } = await pool.query("SELECT count(*)::int AS n FROM fila_do_dia");
  console.log(`fila_do_dia: ${fila[0]!.n} veículo(s)`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

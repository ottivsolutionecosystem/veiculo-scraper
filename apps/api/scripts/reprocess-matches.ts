/**
 * Recoloca tipo_anunciante nos anúncios Shopcar já gravados e refaz
 * match FIPE + score. Não coleta de novo.
 */
import { Pool } from "pg";

import { env } from "../src/env.js";
import { matchFipeForVehicle } from "../src/jobs/match-fipe.js";
import { calculateScoreForVehicle } from "../src/jobs/score.js";

const pool = new Pool({ connectionString: env.databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    const tipos = await client.query(`
      UPDATE anuncios SET tipo_anunciante = 'particular'
       WHERE fonte = 'shopcar'
         AND (
           fotos::text LIKE '%/stored/veiculos/particular/%'
           OR raw_json::text ILIKE '%anunciante particular%'
           OR raw_json::text LIKE '%/stored/veiculos/particular/%'
         )
         AND tipo_anunciante IS DISTINCT FROM 'particular'
    `);
    const lojas = await client.query(`
      UPDATE anuncios SET tipo_anunciante = 'loja'
       WHERE fonte = 'shopcar'
         AND tipo_anunciante IS NULL
         AND (
           fotos::text LIKE '%/stored/lojas/%'
           OR raw_json::text LIKE '%/stored/lojas/%'
         )
    `);
    console.log(`tipos: ${tipos.rowCount ?? 0} particular, ${lojas.rowCount ?? 0} loja.`);

    const { rows } = await client.query<{ id: number }>("SELECT id FROM veiculos ORDER BY id");
    for (const row of rows) {
      try {
        await matchFipeForVehicle(client, row.id);
        await calculateScoreForVehicle(client, row.id);
        console.log(`veículo ${row.id}: fipe+score ok`);
      } catch (err) {
        console.warn(`veículo ${row.id}:`, err);
      }
    }
  } finally {
    client.release();
  }

  await pool.query("REFRESH MATERIALIZED VIEW fila_do_dia");
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n,
            count(*) FILTER (WHERE tipo_anunciante = 'particular')::int AS particulares,
            count(*) FILTER (WHERE tipo_anunciante = 'loja')::int AS lojas
       FROM fila_do_dia`,
  );
  console.log("fila_do_dia:", rows[0]);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

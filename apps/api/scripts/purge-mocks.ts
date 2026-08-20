/**
 * Remove anúncios/veículos/clientes gerados pelo seed. Mantém só o que
 * o coletor gravou (id_externo não começa com seed-).
 */
import { Pool } from "pg";

import { env } from "../src/env.js";

const pool = new Pool({ connectionString: env.databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      UPDATE veiculos SET anuncio_principal_id = NULL
       WHERE anuncio_principal_id IN (SELECT id FROM anuncios WHERE id_externo LIKE 'seed-%')
    `);
    await client.query(`
      DELETE FROM preco_historico
       WHERE anuncio_id IN (SELECT id FROM anuncios WHERE id_externo LIKE 'seed-%')
    `);
    await client.query(`
      DELETE FROM anuncio_veiculo
       WHERE anuncio_id IN (SELECT id FROM anuncios WHERE id_externo LIKE 'seed-%')
    `);
    const deletedAds = await client.query("DELETE FROM anuncios WHERE id_externo LIKE 'seed-%'");

    await client.query("DELETE FROM matches_interesse");
    await client.query("DELETE FROM solicitacoes_captacao");
    await client.query("DELETE FROM interesses");
    await client.query("DELETE FROM clientes");

    await client.query(`
      DELETE FROM interacoes i
       WHERE NOT EXISTS (SELECT 1 FROM anuncio_veiculo av WHERE av.veiculo_id = i.veiculo_id)
    `);
    await client.query(`
      DELETE FROM scores s
       WHERE NOT EXISTS (SELECT 1 FROM anuncio_veiculo av WHERE av.veiculo_id = s.veiculo_id)
    `);
    await client.query(`
      DELETE FROM estados_veiculo e
       WHERE NOT EXISTS (SELECT 1 FROM anuncio_veiculo av WHERE av.veiculo_id = e.veiculo_id)
    `);
    const deletedVehicles = await client.query(`
      DELETE FROM veiculos v
       WHERE NOT EXISTS (SELECT 1 FROM anuncio_veiculo av WHERE av.veiculo_id = v.id)
    `);

    await client.query(`
      DELETE FROM contatos_vendedor c
       WHERE NOT EXISTS (SELECT 1 FROM veiculos v WHERE v.vendedor_id = c.vendedor_id)
    `);
    await client.query("DELETE FROM bloqueio_contato");
    await client.query(`
      DELETE FROM vendedores s
       WHERE NOT EXISTS (SELECT 1 FROM veiculos v WHERE v.vendedor_id = s.id)
    `);

    await client.query("DELETE FROM webhook_entregas");
    await client.query("DELETE FROM webhooks");
    await client.query("DELETE FROM auditoria WHERE autor = 'seed' OR detalhe LIKE '%(seed).%'");

    await client.query("COMMIT");
    console.log(
      `purge ok: ${deletedAds.rowCount ?? 0} anúncios seed, ${deletedVehicles.rowCount ?? 0} veículos órfãos.`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await pool.query("REFRESH MATERIALIZED VIEW fila_do_dia");
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM fila_do_dia");
  console.log(`fila_do_dia: ${rows[0]!.n} veículos reais.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

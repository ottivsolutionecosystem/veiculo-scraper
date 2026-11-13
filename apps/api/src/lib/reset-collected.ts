import type { Pool } from "pg";

/**
 * Apaga anúncios/veículos coletados e a fila de ingestão assistida.
 * Mantém FIPE, fontes, operadores e configuração. Pedido explícito de
 * operação — no fluxo normal anúncio que sai do ar é `ativo = false`.
 */
export async function resetCollectedData(pool: Pool): Promise<void> {
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
    // Migration 0023 — se ainda não existir, segue sem bloquear o reset.
    await client.query(`
      DO $$ BEGIN
        IF to_regclass('public.ingestao_listagens') IS NOT NULL THEN
          TRUNCATE ingestao_listagens RESTART IDENTITY CASCADE;
        END IF;
      END $$
    `);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  await pool.query("REFRESH MATERIALIZED VIEW fila_do_dia");
}

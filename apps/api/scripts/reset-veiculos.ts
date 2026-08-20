/**
 * Zera tudo que veio de coleta e apaga a FIPE sintética, deixando só a FIPE
 * oficial (códigos numéricos do provedor) e as configurações.
 *
 * Isto é reset de desenvolvimento, pedido explicitamente. A regra "nunca
 * delete registro" do CLAUDE.md vale para o fluxo normal — anúncio que sai do
 * ar é `ativo = false`, não DELETE — e continua valendo: quem apaga aqui é um
 * script separado que o usuário chama de propósito.
 */
import { Pool } from "pg";

import { env } from "../src/env.js";

const pool = new Pool({ connectionString: env.databaseUrl });

/** Parallelum usa código numérico ("23" GM, "56" Toyota). O seed antigo usava
 * "M0", "M1MO2A3". É o que separa dado oficial de dado inventado. */
const MARCA_SINTETICA = "codigo !~ '^[0-9]+$'";

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      TRUNCATE
        anuncios, veiculos, anuncio_veiculo, preco_historico,
        scores, estados_veiculo, interacoes,
        contatos_vendedor, bloqueio_contato, vendedores,
        matches_interesse, interesses, clientes, solicitacoes_captacao,
        scrape_runs, execucoes_solicitadas, auditoria,
        webhook_entregas, webhooks
      RESTART IDENTITY CASCADE
    `);

    const sinteticas = await client.query<{ codigo: string; nome: string }>(
      `SELECT codigo, nome FROM fipe_marcas WHERE ${MARCA_SINTETICA} ORDER BY nome`,
    );
    if (sinteticas.rowCount) {
      await client.query(`
        DELETE FROM fipe_aliases WHERE fipe_ano_codigo IN (
          SELECT fa.codigo FROM fipe_anos fa
            JOIN fipe_modelos fm ON fm.codigo = fa.modelo_codigo
           WHERE fm.marca_codigo IN (SELECT codigo FROM fipe_marcas WHERE ${MARCA_SINTETICA})
        )
      `);
      await client.query(`
        DELETE FROM fipe_precos WHERE fipe_ano_codigo IN (
          SELECT fa.codigo FROM fipe_anos fa
            JOIN fipe_modelos fm ON fm.codigo = fa.modelo_codigo
           WHERE fm.marca_codigo IN (SELECT codigo FROM fipe_marcas WHERE ${MARCA_SINTETICA})
        )
      `);
      await client.query(`
        DELETE FROM fipe_anos WHERE modelo_codigo IN (
          SELECT codigo FROM fipe_modelos
           WHERE marca_codigo IN (SELECT codigo FROM fipe_marcas WHERE ${MARCA_SINTETICA})
        )
      `);
      await client.query(
        `DELETE FROM fipe_modelos WHERE marca_codigo IN (SELECT codigo FROM fipe_marcas WHERE ${MARCA_SINTETICA})`,
      );
      await client.query(`DELETE FROM fipe_marcas WHERE ${MARCA_SINTETICA}`);
      console.log(
        `fipe sintética removida: ${sinteticas.rowCount} marcas (${sinteticas.rows.map((r) => r.nome).join(", ")})`,
      );
    } else {
      console.log("nenhuma marca FIPE sintética encontrada.");
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await pool.query("REFRESH MATERIALIZED VIEW fila_do_dia");

  const { rows } = await pool.query<{ marcas: number; modelos: number; precos: number }>(`
    SELECT (SELECT count(*) FROM fipe_marcas)::int AS marcas,
           (SELECT count(*) FROM fipe_modelos)::int AS modelos,
           (SELECT count(*) FROM fipe_precos)::int  AS precos
  `);
  console.log(
    `reset ok: 0 anúncios, 0 veículos. FIPE oficial mantida: ` +
      `${rows[0]!.marcas} marcas, ${rows[0]!.modelos} modelos, ${rows[0]!.precos} preços.`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

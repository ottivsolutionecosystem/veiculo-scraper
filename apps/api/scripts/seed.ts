/**
 * Seed de desenvolvimento: só configuração padrão.
 *
 * Não cria veículo, cliente nem anúncio — e principalmente não cria mais
 * tabela FIPE sintética. Preço FIPE inventado (`base * 0.91^idade`) casava
 * com carro real e produzia desconto que não existe; era a causa do "a FIPE
 * não está batendo". FIPE agora vem só do provedor oficial, importada pelo
 * job `fipe:import` / sob demanda no `match:fipe`.
 */
import { Pool } from "pg";

import { env } from "../src/env.js";
import { DISCARD_REASONS } from "./seed-catalog.js";

const pool = new Pool({ connectionString: env.databaseUrl });

async function seedSettingsIfEmpty(client: import("pg").PoolClient) {
  const { rows } = await client.query<{ n: number }>("SELECT count(*)::int AS n FROM configuracoes");
  if (rows[0]!.n > 0) {
    console.log("configuracoes já existem, pulando.");
    return;
  }

  await client.query(
    `INSERT INTO configuracoes (
       versao, pesos, faixas, motivos_descarte, gatilho_retorno_pct, gatilho_retorno_dias,
       cooldown_vendedor_horas, follow_up_dias, curva_km, template_whatsapp,
       horario_permitido_inicio, horario_permitido_fim, autor
     ) VALUES (1,$1,$2,$3,7,30,24,$4,$5,$6,'08:00','20:00','seed')`,
    [
      JSON.stringify([
        { key: "fipe_discount", label: "Desconto vs FIPE", weight: 0.42 },
        { key: "days_listed", label: "Dias no ar", weight: 0.18 },
        { key: "price_drops", label: "Quedas de preço", weight: 0.22 },
        { key: "model_liquidity", label: "Liquidez do modelo", weight: 0.04 },
        { key: "km_vs_average", label: "Km vs média do ano", weight: 0.08 },
        { key: "completeness", label: "Completude", weight: 0.06 },
        { key: "internal_demand", label: "Demanda interna", weight: 0 },
      ]),
      JSON.stringify({ hot: 80, good: 60, warm: 40 }),
      JSON.stringify(DISCARD_REASONS),
      JSON.stringify([2, 7]),
      JSON.stringify([
        { modelYear: 2018, averageKm: 95000 }, { modelYear: 2020, averageKm: 68000 },
        { modelYear: 2022, averageKm: 42000 }, { modelYear: 2024, averageKm: 14000 },
      ]),
      "Olá! Vi o anúncio do seu {{modelo}} {{ano}} por {{preco}} ({{desconto_fipe}} vs FIPE). Trabalhamos com consignação: o carro fica na loja e você recebe na venda. Posso te explicar em dois minutos?",
    ],
  );
  console.log("configuracoes inseridas.");
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await seedSettingsIfEmpty(client);
    await client.query("COMMIT");
    console.log("seed ok: sem veículos fictícios, sem FIPE fictícia.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

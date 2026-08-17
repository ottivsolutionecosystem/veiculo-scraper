/**
 * Seed de desenvolvimento — popula o Postgres local com dado realista pra
 * exercitar a API de verdade e rodar EXPLAIN ANALYZE (RELATORIO.md). Não é
 * migration, não é coleta real: idempotente via TRUNCATE, só para
 * apps/api/scripts/seed.ts e ambiente de dev.
 */
import { createHash } from "node:crypto";
import { Pool } from "pg";

import { env } from "../src/env.js";
import { calculateScore } from "../src/lib/score.js";
import { matchInterestScore } from "../src/lib/match-interesse.js";
import {
  createRng, pick, int, chance,
  BRANDS, MODELS_BY_BRAND, CITIES, COLORS, DISCARD_REASONS, SELLER_NAMES,
  fuelFor, BASE_PRICE_CENTS,
} from "./seed-catalog.js";

const pool = new Pool({ connectionString: env.databaseUrl });
const NOW = new Date("2026-08-17T12:00:00Z");
const FIPE_MONTH = "2026-07";
const YEARS = [2019, 2020, 2021, 2022, 2023, 2024];

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 86_400_000);
}

function fingerprint(marca: string, modelo: string, anoModelo: number, km: number | null, cor: string, cidade: string): string {
  const faixaKm = km === null ? "NA" : String(Math.floor(km / 5000));
  const blob = [marca, modelo, String(anoModelo), faixaKm, cor.toUpperCase(), cidade.toUpperCase()].join("|");
  return createHash("sha1").update(blob).digest("hex");
}

async function truncateAll(client: import("pg").PoolClient) {
  await client.query(`
    TRUNCATE
      webhook_entregas, webhooks, auditoria, configuracoes,
      solicitacoes_captacao, unidades, matches_interesse, interesses, clientes,
      interacoes, bloqueio_contato, contatos_vendedor, estados_veiculo, scores,
      anuncio_veiculo, veiculos, fipe_aliases, fipe_precos, fipe_anos,
      fipe_modelos, fipe_marcas, vendedores, preco_historico, anuncios,
      scrape_runs
    RESTART IDENTITY CASCADE
  `);
}

async function seedFipe(client: import("pg").PoolClient) {
  const rng = createRng(20260717);
  for (const [brandIdx, brand] of BRANDS.entries()) {
    await client.query("INSERT INTO fipe_marcas (codigo, nome) VALUES ($1, $2)", [`M${brandIdx}`, brand]);
    const models = MODELS_BY_BRAND[brand]!;
    for (const [modelIdx, model] of models.entries()) {
      const modelCode = `M${brandIdx}MO${modelIdx}`;
      await client.query("INSERT INTO fipe_modelos (codigo, marca_codigo, nome) VALUES ($1, $2, $3)", [
        modelCode, `M${brandIdx}`, model,
      ]);
      const base = BASE_PRICE_CENTS[model] ?? 10_000_000;
      const fuel = fuelFor(model);
      for (const [yearIdx, modelYear] of YEARS.entries()) {
        const anoCode = `${modelCode}A${yearIdx}`;
        await client.query(
          "INSERT INTO fipe_anos (codigo, modelo_codigo, ano_modelo, combustivel) VALUES ($1, $2, $3, $4)",
          [anoCode, modelCode, modelYear, fuel],
        );
        const idade = 2024 - modelYear;
        const depreciado = base * Math.pow(0.91, idade);
        const ruido = 1 + (rng() - 0.5) * 0.04;
        const valor = Math.round((depreciado * ruido) / 100) * 100;
        await client.query(
          "INSERT INTO fipe_precos (fipe_ano_codigo, mes_referencia, valor) VALUES ($1, $2, $3)",
          [anoCode, FIPE_MONTH, valor],
        );
      }
    }
  }
}

interface Seller {
  id: number;
  telefoneE164: string;
}

async function seedSellers(client: import("pg").PoolClient): Promise<Seller[]> {
  const rng = createRng(998877);
  const sellers: Seller[] = [];
  for (const [idx, name] of SELLER_NAMES.entries()) {
    const telefoneE164 = `+55679${8000 + idx}${1000 + idx * 7}`;
    const hash = createHash("sha256").update(telefoneE164).digest("hex");
    const { rows } = await client.query<{ id: number }>(
      "INSERT INTO vendedores (nome, telefone_hash, mutado, nao_perturbe) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, hash, chance(rng, 0.08), chance(rng, 0.12)],
    );
    const id = rows[0]!.id;
    await client.query(
      `INSERT INTO contatos_vendedor (vendedor_id, telefone_e164, fonte_primeira_coleta, ttl_expira_em)
       VALUES ($1, $2, 'shopcar', $3)`,
      [id, telefoneE164, new Date(NOW.getTime() + 180 * 86_400_000)],
    );
    sellers.push({ id, telefoneE164 });
  }
  return sellers;
}

interface SeededVehicle {
  id: number;
  marca: string;
  modelo: string;
  anoModelo: number;
  km: number | null;
  preco: number | null;
  cambio: string;
  cidade: string;
  vendedorId: number;
}

const VEHICLE_STATES = ["new", "analyzing", "interested", "contacted", "negotiating", "lost", "discarded"] as const;

async function seedVehicles(client: import("pg").PoolClient, sellers: Seller[]): Promise<SeededVehicle[]> {
  const rng = createRng(2026717);
  const vehicles: SeededVehicle[] = [];
  const TOTAL = 180;

  for (let i = 0; i < TOTAL; i++) {
    const brand = pick(rng, BRANDS);
    const model = pick(rng, MODELS_BY_BRAND[brand]!);
    const modelYear = chance(rng, 0.85) ? pick(rng, YEARS) : int(rng, 2016, 2026);
    const manufactureYear = chance(rng, 0.5) ? modelYear - 1 : modelYear;
    const base = BASE_PRICE_CENTS[model] ?? 9_000_000;
    const fipeIdx = YEARS.indexOf(modelYear as (typeof YEARS)[number]);
    const fipeEstimate = fipeIdx >= 0 ? base * Math.pow(0.91, 2024 - modelYear) : base;
    const discountFactor = 0.75 + rng() * 0.35;
    const preco = Math.round((fipeEstimate * discountFactor) / 100) * 100;
    const km = chance(rng, 0.95) ? int(rng, 5_000, 140_000) : null;
    const color = pick(rng, COLORS);
    const { city, state } = pick(rng, CITIES);
    const daysListed = int(rng, 1, 120);
    const seller = pick(rng, sellers);
    const source = pick(rng, ["shopcar", "shopcar", "shopcar", "webmotors", "olx"]);
    const active = chance(rng, 0.92);
    const transmission = pick(rng, ["MANUAL", "MANUAL", "AUTOMATICO", "AUTOMATIZADO"]);
    // Reflete o coletor real: nem todo anúncio tem sinal de tipo detectável
    // (JSON-LD sem seller, CSS sem casar) — por isso ~30% fica null.
    const tipoAnunciante = chance(rng, 0.7) ? (chance(rng, 0.55) ? "loja" : "particular") : null;

    const tituloOriginal = `${brand} ${model} ${manufactureYear}/${modelYear}`;
    const tituloNormalizado = tituloOriginal.toUpperCase();
    const fp = fingerprint(brand, model, modelYear, km, color, city);
    const contentHash = createHash("sha256").update(`${i}-${preco}-${km}`).digest("hex").slice(0, 16);

    const { rows: anuncioRows } = await client.query<{ id: number }>(
      `INSERT INTO anuncios (
         fonte, id_externo, url, titulo_original, titulo_normalizado, marca, modelo,
         ano_fabricacao, ano_modelo, km, preco, cambio, combustivel, cor, cidade, uf,
         fotos, tipo_anunciante, fingerprint, content_hash, pendencias, primeira_vista_em, ultima_vista_em, ativo
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING id`,
      [
        source, `seed-${i}`, `https://www.${source}.com.br/veiculo/${100000 + i}`,
        tituloOriginal, tituloNormalizado, brand, model,
        manufactureYear, modelYear, km, preco,
        transmission, fuelFor(model), color, city, state,
        [], tipoAnunciante, fp, contentHash, km === null ? ["km"] : [],
        daysAgo(daysListed), daysAgo(0), active,
      ],
    );
    const anuncioId = anuncioRows[0]!.id;

    const state_ = pick(rng, VEHICLE_STATES);
    const discardReason = state_ === "discarded" ? pick(rng, DISCARD_REASONS) : null;

    const { rows: veiculoRows } = await client.query<{ id: number }>(
      `INSERT INTO veiculos (
         fingerprint, anuncio_principal_id, vendedor_id, estado, motivo_descarte,
         gatilho_retorno_tipo, gatilho_retorno_valor, desconto_fipe_pct, desconto_fipe_reais, fipe_confianca
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (fingerprint) DO NOTHING
       RETURNING id`,
      [
        fp, anuncioId, seller.id, state_, discardReason,
        state_ === "discarded" ? "price_drop" : null,
        state_ === "discarded" ? 7 : null,
        Number((((fipeEstimate - preco) / fipeEstimate) * 100).toFixed(1)),
        Math.round(fipeEstimate - preco),
        chance(rng, 0.88) ? 0.9 + rng() * 0.1 : chance(rng, 0.5) ? 0.6 + rng() * 0.25 : null,
      ],
    );

    // fingerprint colidiu com um veículo existente (mesmo carro, outra fonte)
    // — ON CONFLICT DO NOTHING não devolve linha; busca o id existente e só
    // liga o anúncio a ele.
    const veiculoId = veiculoRows[0]?.id ?? (await client.query<{ id: number }>(
      "SELECT id FROM veiculos WHERE fingerprint = $1", [fp],
    )).rows[0]!.id;

    await client.query(
      "INSERT INTO anuncio_veiculo (anuncio_id, veiculo_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [anuncioId, veiculoId],
    );

    if (veiculoRows[0]) {
      await client.query(
        "INSERT INTO estados_veiculo (veiculo_id, estado, motivo, autor) VALUES ($1, $2, $3, 'seed')",
        [veiculoId, state_, discardReason],
      );

      const score = calculateScore({
        fipeDiscountPct: Number((((fipeEstimate - preco) / fipeEstimate) * 100).toFixed(1)),
        daysListed,
        priceDropsCount: chance(rng, 0.35) ? int(rng, 1, 4) : 0,
        modelLiquidityScore: int(rng, 30, 90),
        kmVsAveragePct: int(rng, -30, 30),
        completenessPct: km === null ? 80 : 100,
        compatibleCustomers: 0, // recalculado depois do match:interesse
        riskFlags: chance(rng, 0.05) ? ["preco_suspeito"] : [],
        weights: [
          { key: "fipe_discount", weight: 0.28 },
          { key: "days_listed", weight: 0.12 },
          { key: "price_drops", weight: 0.1 },
          { key: "model_liquidity", weight: 0.1 },
          { key: "km_vs_average", weight: 0.1 },
          { key: "completeness", weight: 0.08 },
          { key: "internal_demand", weight: 0.22 },
        ],
        bandThresholds: { hot: 80, good: 60, warm: 40 },
      });
      await client.query(
        "INSERT INTO scores (veiculo_id, total, faixa, componentes) VALUES ($1, $2, $3, $4)",
        [veiculoId, score.total, score.band, JSON.stringify(score.components)],
      );

      vehicles.push({
        id: veiculoId, marca: brand, modelo: model, anoModelo: modelYear,
        km, preco, cambio: transmission, cidade: city, vendedorId: seller.id,
      });
    }
  }

  return vehicles;
}

const CUSTOMER_NAMES = [
  "Gabriel Henrique Souza", "Larissa Fernandes", "Rodrigo Alves Martins",
  "Juliana Cristina Pinto", "Felipe Augusto Ribeiro", "Beatriz Almeida",
  "Thiago Nascimento", "Amanda Carvalho", "Leonardo Vieira Costa",
  "Isabela Moraes", "Vinícius Rocha", "Letícia Barros",
  "André Luiz Fonseca", "Priscila Gomes", "Rafael Duarte Melo",
];
const ORIGINS = ["Indicação", "Instagram", "Loja física", "WhatsApp", "Site"];
const OWNERS = ["Ana Ferreira", "Bruno Castro", "Camila Duarte"];

async function seedCustomers(client: import("pg").PoolClient, vehicles: SeededVehicle[]) {
  const rng = createRng(151515);

  for (const [idx, name] of CUSTOMER_NAMES.entries()) {
    const { rows } = await client.query<{ id: number }>(
      "INSERT INTO clientes (nome, contato, origem, responsavel) VALUES ($1,$2,$3,$4) RETURNING id",
      [name, `(67) 9${8000 + idx * 37}-${1000 + idx * 71}`, pick(rng, ORIGINS), pick(rng, OWNERS)],
    );
    const clienteId = rows[0]!.id;

    const brand = pick(rng, BRANDS);
    const model = pick(rng, MODELS_BY_BRAND[brand]!);
    const criteria = {
      brand,
      model,
      yearMin: int(rng, 2016, 2021),
      yearMax: int(rng, 2022, 2025),
      maxKm: int(rng, 40, 150) * 1000,
      priceMinCents: null,
      priceMaxCents: int(rng, 60, 220) * 100_000,
      transmission: null,
      city: null,
    };
    const { rows: interestRows } = await client.query<{ id: number }>(
      `INSERT INTO interesses (cliente_id, marca, modelo, ano_min, ano_max, km_maximo, preco_max, prioridade, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active') RETURNING id`,
      [clienteId, brand, model, criteria.yearMin, criteria.yearMax, criteria.maxKm, criteria.priceMaxCents, pick(rng, ["high", "medium", "low"])],
    );
    const interesseId = interestRows[0]!.id;

    for (const vehicle of vehicles) {
      if (vehicle.marca !== brand || vehicle.modelo !== model) continue;
      const score = matchInterestScore(criteria, {
        brand: vehicle.marca,
        model: vehicle.modelo,
        modelYear: vehicle.anoModelo,
        km: vehicle.km,
        priceCents: vehicle.preco,
        transmission: vehicle.cambio,
        city: vehicle.cidade,
      });
      if (score === null) continue;
      await client.query(
        `INSERT INTO matches_interesse (interesse_id, veiculo_id, score_aderencia, estado)
         VALUES ($1, $2, $3, 'suggested') ON CONFLICT DO NOTHING`,
        [interesseId, vehicle.id, score],
      );
    }
  }
}

async function seedBranchesAndRequests(client: import("pg").PoolClient, vehicles: SeededVehicle[]) {
  const rng = createRng(4242);
  const branchIds: number[] = [];
  for (const [name, address, limit] of [
    ["Loja Campo Grande — Matriz", "Av. Afonso Pena, 4200 — Campo Grande/MS", 4],
    ["Loja Dourados", "Av. Weimar Gonçalves Torres, 1800 — Dourados/MS", 2],
    ["Loja Três Lagoas", "Av. Capitão Olinto Mancini, 950 — Três Lagoas/MS", 2],
  ] as const) {
    const { rows } = await client.query<{ id: number }>(
      "INSERT INTO unidades (nome, endereco, limite_veiculos_por_periodo) VALUES ($1,$2,$3) RETURNING id",
      [name, address, limit],
    );
    branchIds.push(rows[0]!.id);
  }

  const states = ["requested", "accepted", "scheduled", "vehicle_at_branch", "under_evaluation", "offer_made", "closed", "no_show"] as const;
  for (const state of states) {
    const vehicle = pick(rng, vehicles);
    await client.query(
      `INSERT INTO solicitacoes_captacao (veiculo_id, vendedor_id, unidade_id, responsavel, data_hora_proposta, estado, checklist)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        vehicle.id, vehicle.vendedorId, pick(rng, branchIds), pick(rng, OWNERS), daysAgo(int(rng, 0, 10)), state,
        JSON.stringify(
          state === "closed"
            ? { documento: true, chaveReserva: true, manual: true, vistoria: true, fotosPadronizadas: true, avaliacao: true }
            : { documento: false, chaveReserva: false, manual: false, vistoria: false, fotosPadronizadas: false, avaliacao: false },
        ),
      ],
    );
  }
}

async function seedSettingsAuditWebhooks(client: import("pg").PoolClient) {
  await client.query(
    `INSERT INTO configuracoes (
       versao, pesos, faixas, motivos_descarte, gatilho_retorno_pct, gatilho_retorno_dias,
       cooldown_vendedor_horas, follow_up_dias, curva_km, template_whatsapp,
       horario_permitido_inicio, horario_permitido_fim, autor
     ) VALUES (1,$1,$2,$3,7,30,24,$4,$5,$6,'08:00','20:00','seed')`,
    [
      JSON.stringify([
        { key: "fipe_discount", label: "Desconto vs FIPE", weight: 0.28 },
        { key: "days_listed", label: "Dias no ar", weight: 0.12 },
        { key: "price_drops", label: "Quedas de preço", weight: 0.1 },
        { key: "model_liquidity", label: "Liquidez do modelo", weight: 0.1 },
        { key: "km_vs_average", label: "Km vs média do ano", weight: 0.1 },
        { key: "completeness", label: "Completude", weight: 0.08 },
        { key: "internal_demand", label: "Demanda interna", weight: 0.22 },
      ]),
      JSON.stringify({ hot: 80, good: 60, warm: 40 }),
      JSON.stringify(DISCARD_REASONS),
      JSON.stringify([2, 7]),
      JSON.stringify([
        { modelYear: 2018, averageKm: 95000 }, { modelYear: 2020, averageKm: 68000 },
        { modelYear: 2022, averageKm: 42000 }, { modelYear: 2024, averageKm: 14000 },
      ]),
      "Olá! Vi o anúncio do seu {{modelo}} {{ano}} por {{preco}} ({{desconto_fipe}} abaixo da FIPE). Ainda está disponível?",
    ],
  );

  await client.query(
    `INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe) VALUES
     ('change_weight', 'Camila Duarte', 'settings', 'internal_demand', 'Peso alterado de 0.18 para 0.22 (seed).')`,
  );

  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO webhooks (url, eventos, ativo, segredo) VALUES
     ('https://hooks.exemplo.com.br/veiculo-scraper', $1, true, 'segredo-dev-nao-usar-em-producao')
     RETURNING id`,
    [JSON.stringify(["veiculo.novo", "veiculo.preco_caiu", "match.encontrado"])],
  );
  await client.query(
    "INSERT INTO webhook_entregas (webhook_id, evento, payload, status_http, sucesso) VALUES ($1, 'veiculo.novo', $2, 200, true)",
    [rows[0]!.id, JSON.stringify({ seed: true })],
  );
}

async function seedInteractions(client: import("pg").PoolClient, vehicles: SeededVehicle[]) {
  const rng = createRng(778899);
  const sample = vehicles.slice(0, 40);
  for (const vehicle of sample) {
    if (!chance(rng, 0.4)) continue;
    await client.query(
      `INSERT INTO interacoes (veiculo_id, vendedor_id, canal, resultado, duracao_segundos, autor, criado_em)
       VALUES ($1,$2,$3,$4,$5,'seed',$6)`,
      [
        vehicle.id, vehicle.vendedorId, pick(rng, ["phone", "whatsapp"]),
        pick(rng, ["no_answer", "not_interested", "thinking", "negotiating", "agreed_to_bring", "wrong_number"]),
        int(rng, 30, 400), daysAgo(int(rng, 0, 5)),
      ],
    );
  }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("truncando tabelas...");
    await client.query("BEGIN");
    await truncateAll(client);

    console.log("fipe...");
    await seedFipe(client);

    console.log("vendedores...");
    const sellers = await seedSellers(client);

    console.log("veiculos/anuncios/scores...");
    const vehicles = await seedVehicles(client, sellers);

    console.log("clientes/interesses/matches...");
    await seedCustomers(client, vehicles);

    console.log("unidades/solicitacoes...");
    await seedBranchesAndRequests(client, vehicles);

    console.log("configuracoes/auditoria/webhooks...");
    await seedSettingsAuditWebhooks(client);

    console.log("interacoes...");
    await seedInteractions(client, vehicles);

    await client.query("COMMIT");
    console.log(`seed ok: ${vehicles.length} veículos.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  console.log("refresh fila_do_dia...");
  await pool.query("REFRESH MATERIALIZED VIEW fila_do_dia");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

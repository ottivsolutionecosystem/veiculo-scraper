import type { PoolClient } from "pg";

import { calculateScore } from "../lib/score.js";

/** Job `score` (SPEC seção 9): roda em mudança de preço, mudança de peso
 * (em massa) e diariamente pros componentes temporais. Persiste — nunca
 * calculado em tempo de request (CLAUDE.md). */
export async function calculateScoreForVehicle(client: PoolClient, veiculoId: number): Promise<void> {
  const { rows: cfgRows } = await client.query("SELECT pesos, faixas FROM configuracoes ORDER BY versao DESC LIMIT 1");
  const cfg = cfgRows[0];
  if (!cfg) throw new Error("score: nenhuma configuracoes cadastrada");

  const { rows: vehicleRows } = await client.query(
    `SELECT v.id, v.desconto_fipe_pct,
            EXTRACT(DAY FROM now() - a.primeira_vista_em)::int AS dias_no_ar,
            a.km, a.marca, a.modelo, a.ano_modelo,
            array_length(a.pendencias, 1) AS pendencias_count,
            (SELECT count(*) FROM matches_interesse mi WHERE mi.veiculo_id = v.id AND mi.estado != 'discarded') AS clientes,
            (SELECT count(*) FROM anuncio_veiculo av
               JOIN preco_historico ph ON ph.anuncio_id = av.anuncio_id
              WHERE av.veiculo_id = v.id) AS quedas_preco
       FROM veiculos v JOIN anuncios a ON a.id = v.anuncio_principal_id
      WHERE v.id = $1`,
    [veiculoId],
  );
  const vehicle = vehicleRows[0];
  if (!vehicle) throw new Error(`score: veículo ${veiculoId} não encontrado`);

  const completenessPct = Math.round(((5 - (vehicle.pendencias_count ?? 0)) / 5) * 100);

  const result = calculateScore({
    fipeDiscountPct: vehicle.desconto_fipe_pct === null ? null : Number(vehicle.desconto_fipe_pct),
    daysListed: Number(vehicle.dias_no_ar ?? 0),
    priceDropsCount: Math.max(0, Number(vehicle.quedas_preco ?? 0) - 1),
    modelLiquidityScore: null, // sem histórico de liquidez calculado ainda — usa neutro (lib/score.ts)
    kmVsAveragePct: null, // curva de km por ano fica pra cálculo específico, fora do escopo desta chamada
    completenessPct,
    compatibleCustomers: 0, // consignação: comprador interno não ranqueia
    riskFlags: [],
    weights: cfg.pesos,
    bandThresholds: cfg.faixas,
  });

  await client.query(
    `INSERT INTO scores (veiculo_id, total, faixa, componentes, calculado_em)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (veiculo_id) DO UPDATE SET
       total = EXCLUDED.total, faixa = EXCLUDED.faixa, componentes = EXCLUDED.componentes, calculado_em = now()`,
    [veiculoId, result.total, result.band, JSON.stringify(result.components)],
  );
}

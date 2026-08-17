import type { PoolClient } from "pg";

import { rankFipeCandidates, classifyFipeMatch, type FipeCandidate } from "../lib/fipe-match.js";

/** Job `match:fipe` (SPEC seção 8): roda após normalize, resolve o match
 * automático ou deixa pendente pra fila de revisão. */
export async function matchFipeForVehicle(client: PoolClient, veiculoId: number): Promise<void> {
  const { rows: vehicleRows } = await client.query(
    `SELECT a.marca, a.modelo, a.titulo_normalizado, a.ano_modelo, a.combustivel, a.preco
       FROM veiculos v JOIN anuncios a ON a.id = v.anuncio_principal_id
      WHERE v.id = $1`,
    [veiculoId],
  );
  const listing = vehicleRows[0];
  if (!listing) throw new Error(`match:fipe: veículo ${veiculoId} não encontrado`);

  // Alias já confirmado pra esse padrão de título? Aplica direto, sem
  // rodar trigram de novo (seção 8: "confirmação manual grava alias e
  // vale dali em diante").
  const { rows: aliasRows } = await client.query(
    "SELECT fipe_ano_codigo FROM fipe_aliases WHERE padrao_texto = $1",
    [listing.titulo_normalizado],
  );
  if (aliasRows[0]) {
    await applyMatch(client, veiculoId, aliasRows[0].fipe_ano_codigo, 1.0, null, listing.preco);
    return;
  }

  if (!listing.marca) {
    await client.query(
      "UPDATE veiculos SET fipe_confianca = NULL, fipe_candidatos = NULL, atualizado_em = now() WHERE id = $1",
      [veiculoId],
    );
    return;
  }

  const { rows: candidateRows } = await client.query(
    `SELECT fa.codigo AS fipe_code, fm.marca_codigo, mk.nome AS marca, fm.nome AS modelo,
            fa.ano_modelo, fa.combustivel AS fuel_type
       FROM fipe_anos fa
       JOIN fipe_modelos fm ON fm.codigo = fa.modelo_codigo
       JOIN fipe_marcas mk ON mk.codigo = fm.marca_codigo
      WHERE mk.nome = $1`,
    [listing.marca],
  );
  const candidates: FipeCandidate[] = candidateRows.map((r) => ({
    fipeCode: r.fipe_code,
    brand: r.marca,
    model: r.modelo,
    trim: null,
    modelYear: r.ano_modelo,
    fuelType: r.fuel_type,
  }));

  const ranked = rankFipeCandidates(
    { brand: listing.marca, normalizedTitle: listing.titulo_normalizado, modelYear: listing.ano_modelo, fuelType: listing.combustivel },
    candidates,
  );
  const outcome = classifyFipeMatch(ranked);

  if (outcome.status === "auto") {
    await applyMatch(client, veiculoId, outcome.result.candidate.fipeCode, outcome.result.confidence, null, listing.preco);
  } else if (outcome.status === "review") {
    await client.query(
      `UPDATE veiculos SET fipe_confianca = $2, fipe_candidatos = $3, atualizado_em = now() WHERE id = $1`,
      [
        veiculoId,
        outcome.candidates[0]!.confidence,
        JSON.stringify(
          outcome.candidates.map((c) => ({
            fipeCode: c.candidate.fipeCode,
            label: `${c.candidate.model} ${c.candidate.trim ?? ""} ${c.candidate.modelYear}`.trim(),
            confidence: c.confidence,
          })),
        ),
      ],
    );
  } else {
    await client.query(
      "UPDATE veiculos SET fipe_confianca = NULL, fipe_candidatos = NULL, atualizado_em = now() WHERE id = $1",
      [veiculoId],
    );
  }
}

async function applyMatch(
  client: PoolClient,
  veiculoId: number,
  fipeAnoCodigo: string,
  confidence: number,
  _unused: null,
  precoAtual: number | null,
) {
  const { rows } = await client.query(
    "SELECT fp.valor FROM fipe_precos fp WHERE fp.fipe_ano_codigo = $1 ORDER BY fp.mes_referencia DESC LIMIT 1",
    [fipeAnoCodigo],
  );
  const valorFipe = rows[0]?.valor as number | undefined;
  const descontoReais = valorFipe !== undefined && precoAtual !== null ? valorFipe - precoAtual : null;
  const descontoPct =
    valorFipe !== undefined && precoAtual !== null ? Number((((valorFipe - precoAtual) / valorFipe) * 100).toFixed(1)) : null;

  await client.query(
    `UPDATE veiculos SET fipe_ano_codigo = $2, fipe_confianca = $3, fipe_candidatos = NULL,
                          desconto_fipe_pct = $4, desconto_fipe_reais = $5, atualizado_em = now()
      WHERE id = $1`,
    [veiculoId, fipeAnoCodigo, confidence, descontoPct, descontoReais],
  );
}

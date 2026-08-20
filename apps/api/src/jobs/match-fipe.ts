import type { PoolClient } from "pg";

import { brandsCompatible } from "../lib/fipe-brands.js";
import { rankFipeCandidates, classifyFipeMatch, type FipeCandidate } from "../lib/fipe-match.js";
import { importFipeBrandModels } from "./fipe-import.js";
import { ParallelumFipeProvider } from "../providers/parallelum-fipe-provider.js";

/** Job `match:fipe` (SPEC seção 8): roda após normalize, resolve o match
 * automático ou deixa pendente pra fila de revisão.
 *
 * Só entram candidatos que têm preço publicado — casar com uma linha da FIPE
 * sem valor não produz desconto nenhum e ainda dá a impressão de que o carro
 * foi avaliado. Se a tabela local não cobre a marca/ano, o provedor oficial é
 * consultado uma vez e o match é refeito. */
export async function matchFipeForVehicle(client: PoolClient, veiculoId: number): Promise<void> {
  const { rows: vehicleRows } = await client.query<ListingRow>(
    `SELECT a.marca, a.modelo, a.versao, a.titulo_normalizado, a.ano_modelo,
            a.combustivel, a.cambio, a.preco
       FROM veiculos v JOIN anuncios a ON a.id = v.anuncio_principal_id
      WHERE v.id = $1`,
    [veiculoId],
  );
  const listing = vehicleRows[0];
  if (!listing) throw new Error(`match:fipe: veículo ${veiculoId} não encontrado`);

  const { rows: aliasRows } = await client.query(
    "SELECT fipe_ano_codigo FROM fipe_aliases WHERE padrao_texto = $1",
    [listing.titulo_normalizado],
  );
  if (aliasRows[0]) {
    await applyMatch(client, veiculoId, aliasRows[0].fipe_ano_codigo, 1.0, listing.preco);
    return;
  }

  if (!listing.marca || !listing.modelo) {
    await clearMatch(client, veiculoId);
    return;
  }

  let candidates = await loadCandidates(client, listing.marca, listing.ano_modelo);
  let outcome = classifyLocal(listing, candidates);

  // Tabela local vazia para essa marca/ano é o caso comum no início: importa
  // a marca sob demanda em vez de baixar a FIPE inteira.
  if (outcome.status !== "auto") {
    try {
      await importFipeBrandModels(
        client,
        new ParallelumFipeProvider(),
        listing.marca,
        listing.modelo,
      );
      candidates = await loadCandidates(client, listing.marca, listing.ano_modelo);
      outcome = classifyLocal(listing, candidates);
    } catch (err) {
      console.warn(`match:fipe: provedor oficial falhou para veículo ${veiculoId}:`, err);
    }
  }

  if (outcome.status === "auto") {
    await applyMatch(
      client,
      veiculoId,
      outcome.result.candidate.fipeCode,
      outcome.result.confidence,
      listing.preco,
    );
  } else if (outcome.status === "review") {
    await client.query(
      `UPDATE veiculos SET fipe_ano_codigo = NULL, fipe_confianca = $2, fipe_candidatos = $3,
                            desconto_fipe_pct = NULL, desconto_fipe_reais = NULL,
                            atualizado_em = now()
        WHERE id = $1`,
      [
        veiculoId,
        outcome.candidates[0]!.confidence,
        JSON.stringify(
          outcome.candidates.map((c) => ({
            fipeCode: c.candidate.fipeCode,
            label: `${c.candidate.model} ${c.candidate.modelYear}`,
            confidence: Number(c.confidence.toFixed(3)),
          })),
        ),
      ],
    );
  } else {
    await clearMatch(client, veiculoId);
  }
}

type ListingRow = {
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  titulo_normalizado: string;
  ano_modelo: number | null;
  combustivel: string | null;
  cambio: string | null;
  preco: number | null;
};

function classifyLocal(listing: ListingRow, candidates: FipeCandidate[]) {
  return classifyFipeMatch(
    rankFipeCandidates(
      {
        brand: listing.marca,
        model: listing.modelo,
        trim: listing.versao,
        normalizedTitle: listing.titulo_normalizado,
        modelYear: listing.ano_modelo,
        fuelType: listing.combustivel,
        transmission: listing.cambio,
      },
      candidates,
    ),
  );
}

async function clearMatch(client: PoolClient, veiculoId: number) {
  await client.query(
    `UPDATE veiculos SET fipe_ano_codigo = NULL, fipe_confianca = NULL, fipe_candidatos = NULL,
                          desconto_fipe_pct = NULL, desconto_fipe_reais = NULL,
                          atualizado_em = now()
      WHERE id = $1`,
    [veiculoId],
  );
}

/** Candidatos da marca no ano exato do anúncio, e só os que têm preço. O
 * resto do filtro (modelo, cilindrada, versão) é dos vetos do matcher. */
async function loadCandidates(
  client: PoolClient,
  marca: string,
  anoModelo: number | null,
): Promise<FipeCandidate[]> {
  const { rows: brandRows } = await client.query<{ codigo: string; nome: string }>(
    "SELECT codigo, nome FROM fipe_marcas",
  );
  const brandCodes = brandRows.filter((b) => brandsCompatible(b.nome, marca)).map((b) => b.codigo);
  if (brandCodes.length === 0) return [];

  const { rows } = await client.query<{
    fipe_code: string;
    marca: string;
    modelo: string;
    ano_modelo: number;
    fuel_type: string;
  }>(
    `SELECT fa.codigo AS fipe_code, mk.nome AS marca, fm.nome AS modelo,
            fa.ano_modelo, fa.combustivel AS fuel_type
       FROM fipe_anos fa
       JOIN fipe_modelos fm ON fm.codigo = fa.modelo_codigo
       JOIN fipe_marcas mk ON mk.codigo = fm.marca_codigo
      WHERE mk.codigo = ANY($1)
        AND ($2::int IS NULL OR fa.ano_modelo = $2)
        AND EXISTS (SELECT 1 FROM fipe_precos fp WHERE fp.fipe_ano_codigo = fa.codigo)`,
    [brandCodes, anoModelo],
  );

  return rows.map((r) => ({
    fipeCode: r.fipe_code,
    brand: r.marca,
    model: r.modelo,
    modelYear: r.ano_modelo,
    fuelType: r.fuel_type,
  }));
}

async function applyMatch(
  client: PoolClient,
  veiculoId: number,
  fipeAnoCodigo: string,
  confidence: number,
  precoAtual: number | null,
) {
  const { rows } = await client.query(
    "SELECT fp.valor FROM fipe_precos fp WHERE fp.fipe_ano_codigo = $1 ORDER BY fp.mes_referencia DESC LIMIT 1",
    [fipeAnoCodigo],
  );
  const valorFipe = rows[0]?.valor === undefined ? undefined : Number(rows[0].valor);
  const temValor = valorFipe !== undefined && valorFipe > 0 && precoAtual !== null;
  const descontoReais = temValor ? valorFipe! - precoAtual! : null;
  const descontoPct = temValor
    ? Number((((valorFipe! - precoAtual!) / valorFipe!) * 100).toFixed(1))
    : null;

  await client.query(
    `UPDATE veiculos SET fipe_ano_codigo = $2, fipe_confianca = $3, fipe_candidatos = NULL,
                          desconto_fipe_pct = $4, desconto_fipe_reais = $5, atualizado_em = now()
      WHERE id = $1`,
    [veiculoId, fipeAnoCodigo, confidence, descontoPct, descontoReais],
  );
}

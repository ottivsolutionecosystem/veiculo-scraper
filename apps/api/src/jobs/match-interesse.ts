import type { PoolClient } from "pg";

import { matchInterestScore } from "../lib/match-interesse.js";

/** Job `match:interesse` (SPEC seção 10): roda a cada veículo novo ou
 * atualizado, contra interesses ativos com marca/modelo compatível
 * (índice parcial ix_interesses_marca_modelo_ativos — docs/MODELO.md). */
export async function matchInterestsForVehicle(client: PoolClient, veiculoId: number): Promise<number> {
  const { rows: vehicleRows } = await client.query(
    `SELECT a.marca, a.modelo, a.ano_modelo, a.km, a.preco, a.cambio, a.cidade
       FROM veiculos v JOIN anuncios a ON a.id = v.anuncio_principal_id
      WHERE v.id = $1`,
    [veiculoId],
  );
  const vehicle = vehicleRows[0];
  if (!vehicle) throw new Error(`match:interesse: veículo ${veiculoId} não encontrado`);

  const { rows: interests } = await client.query(
    `SELECT * FROM interesses
      WHERE status = 'active' AND (marca IS NULL OR marca = $1) AND (modelo IS NULL OR modelo = $2)`,
    [vehicle.marca, vehicle.modelo],
  );

  let matchCount = 0;
  for (const interest of interests) {
    const score = matchInterestScore(
      {
        brand: interest.marca,
        model: interest.modelo,
        yearMin: interest.ano_min,
        yearMax: interest.ano_max,
        maxKm: interest.km_maximo,
        priceMinCents: interest.preco_min,
        priceMaxCents: interest.preco_max,
        transmission: interest.cambio,
        city: interest.cidade,
      },
      {
        brand: vehicle.marca,
        model: vehicle.modelo,
        modelYear: vehicle.ano_modelo,
        km: vehicle.km,
        priceCents: vehicle.preco,
        transmission: vehicle.cambio,
        city: vehicle.cidade,
      },
    );
    if (score === null) continue;

    await client.query(
      `INSERT INTO matches_interesse (interesse_id, veiculo_id, score_aderencia, estado)
       VALUES ($1, $2, $3, 'suggested')
       ON CONFLICT (interesse_id, veiculo_id) DO UPDATE SET score_aderencia = EXCLUDED.score_aderencia`,
      [interest.id, veiculoId, score],
    );
    matchCount++;
  }

  return matchCount;
}

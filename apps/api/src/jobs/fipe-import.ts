import type { PoolClient } from "pg";

import type { FipeProvider } from "../providers/fipe-provider.js";

/**
 * Job mensal de ingestão FIPE (SPEC seção 8): tabela inteira importada e
 * versionada por mes_referencia, nunca consultada por anúncio. Idempotente
 * via upsert nas chaves naturais (docs/MODELO.md).
 */
export async function importFipeTable(client: PoolClient, provider: FipeProvider): Promise<{ brands: number; models: number; years: number; prices: number }> {
  let brandsCount = 0;
  let modelsCount = 0;
  let yearsCount = 0;
  let pricesCount = 0;

  const brands = await provider.listBrands();
  for (const brand of brands) {
    await client.query(
      "INSERT INTO fipe_marcas (codigo, nome) VALUES ($1, $2) ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome",
      [brand.code, brand.name],
    );
    brandsCount++;

    const models = await provider.listModels(brand.code);
    for (const model of models) {
      const modelCode = `${brand.code}:${model.code}`;
      await client.query(
        "INSERT INTO fipe_modelos (codigo, marca_codigo, nome) VALUES ($1, $2, $3) ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome",
        [modelCode, brand.code, model.name],
      );
      modelsCount++;

      const years = await provider.listYears(brand.code, model.code);
      for (const year of years) {
        const yearCode = `${modelCode}:${year.code}`;
        await client.query(
          `INSERT INTO fipe_anos (codigo, modelo_codigo, ano_modelo, combustivel) VALUES ($1, $2, $3, $4)
           ON CONFLICT (codigo) DO NOTHING`,
          [yearCode, modelCode, year.modelYear, year.fuelType],
        );
        yearsCount++;

        const price = await provider.getPrice(brand.code, model.code, year.code);
        await client.query(
          `INSERT INTO fipe_precos (fipe_ano_codigo, mes_referencia, valor) VALUES ($1, $2, $3)
           ON CONFLICT (fipe_ano_codigo, mes_referencia) DO UPDATE SET valor = EXCLUDED.valor`,
          [yearCode, price.referenceMonth, price.valueCents],
        );
        pricesCount++;
      }
    }
  }

  return { brands: brandsCount, models: modelsCount, years: yearsCount, prices: pricesCount };
}

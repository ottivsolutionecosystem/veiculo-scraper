import type { PoolClient } from "pg";

import { brandsCompatible } from "../lib/fipe-brands.js";
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

/**
 * Importa uma marca (e, se `modelHint` casar, só os modelos dela) do
 * provedor oficial. Usado no match sob demanda — tabela inteira é lenta
 * demais para o worker de anúncio.
 */
export async function importFipeBrandModels(
  client: PoolClient,
  provider: FipeProvider,
  brandName: string,
  modelHint: string | null,
): Promise<{ brands: number; models: number; years: number; prices: number }> {
  const brands = await provider.listBrands();
  const brand = brands.find((b) => brandsCompatible(b.name, brandName));
  if (!brand) return { brands: 0, models: 0, years: 0, prices: 0 };

  await client.query(
    "INSERT INTO fipe_marcas (codigo, nome) VALUES ($1, $2) ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome",
    [brand.code, brand.name],
  );

  let models = await provider.listModels(brand.code);
  if (modelHint) {
    const hint = modelHint.toUpperCase();
    const filtered = models.filter((m) => m.name.toUpperCase().includes(hint));
    if (filtered.length > 0) models = filtered;
  }

  let modelsCount = 0;
  let yearsCount = 0;
  let pricesCount = 0;

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

  return { brands: 1, models: modelsCount, years: yearsCount, prices: pricesCount };
}

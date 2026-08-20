import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../db.js";
import type { FipeProvider } from "../providers/fipe-provider.js";
import { importFipeBrandModels, importFipeTable } from "./fipe-import.js";

/**
 * Testa a gravação no Postgres local (migrations já aplicadas — ver
 * db/migrations). Não testa nenhum provedor real. Roda dentro
 * de uma transação com ROLLBACK — não suja o banco de dev.
 */
class FakeFipeProvider implements FipeProvider {
  async listBrands() {
    return [{ code: "21", name: "TOYOTA" }];
  }
  async listModels() {
    return [{ code: "7541", name: "COROLLA" }];
  }
  async listYears() {
    return [{ code: "2020-1", modelYear: 2020, fuelType: "FLEX" }];
  }
  async getPrice() {
    return { valueCents: 12_345_600, referenceMonth: "2026-07" };
  }
}

describe("importação FIPE", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("grava marca, modelo, ano e preço de forma idempotente (upsert)", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const first = await importFipeTable(client, new FakeFipeProvider());
      expect(first).toEqual({ brands: 1, models: 1, years: 1, prices: 1 });

      const second = await importFipeTable(client, new FakeFipeProvider());
      expect(second).toEqual({ brands: 1, models: 1, years: 1, prices: 1 });

      const { rows } = await client.query("SELECT * FROM fipe_precos WHERE fipe_ano_codigo = '21:7541:2020-1'");
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].valor)).toBe(12_345_600);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("importa só a marca pedida e o modelo que casa com o hint", async () => {
    class MultiBrandFake implements FipeProvider {
      async listBrands() {
        return [
          { code: "21", name: "TOYOTA" },
          { code: "22", name: "GM - Chevrolet" },
        ];
      }
      async listModels(brandCode: string) {
        if (brandCode === "21") return [{ code: "7541", name: "Corolla XEi 2.0" }, { code: "9", name: "Hilux SRV" }];
        return [{ code: "1", name: "Onix LT" }];
      }
      async listYears() {
        return [{ code: "2020-1", modelYear: 2020, fuelType: "FLEX" }];
      }
      async getPrice() {
        return { valueCents: 9_000_000, referenceMonth: "2026-07" };
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await importFipeBrandModels(client, new MultiBrandFake(), "TOYOTA", "HILUX");
      expect(result).toEqual({ brands: 1, models: 1, years: 1, prices: 1 });
      const { rows } = await client.query("SELECT nome FROM fipe_modelos WHERE codigo = '21:9'");
      expect(rows.map((r) => r.nome)).toEqual(["Hilux SRV"]);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});

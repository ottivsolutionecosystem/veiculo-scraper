import type { FipeProvider, FipeProviderBrand, FipeProviderModel, FipeProviderYear, FipeProviderPrice } from "./fipe-provider.js";

/**
 * API pública fipe.parallelum.com.br. Sem chave. Rate-limit educado
 * (retry em 429). Combustível lido do nome do ano, não do sufixo numérico
 * (Flex não é o código 3 de forma estável).
 */
export class ParallelumFipeProvider implements FipeProvider {
  constructor(private readonly baseUrl = "https://fipe.parallelum.com.br/api/v2/cars") {}

  async listBrands(): Promise<FipeProviderBrand[]> {
    const data = await this.fetchJson<{ code: string; name: string }[]>("/brands");
    return data.map((b) => ({ code: b.code, name: b.name }));
  }

  async listModels(brandCode: string): Promise<FipeProviderModel[]> {
    const data = await this.fetchJson<{ code: string; name: string }[]>(`/brands/${brandCode}/models`);
    return data.map((m) => ({ code: m.code, name: m.name }));
  }

  async listYears(brandCode: string, modelCode: string): Promise<FipeProviderYear[]> {
    const data = await this.fetchJson<{ code: string; name: string }[]>(
      `/brands/${brandCode}/models/${modelCode}/years`,
    );
    return data.map((y) => {
      const yearPart = y.code.split("-")[0] ?? y.code;
      return {
        code: y.code,
        modelYear: Number(yearPart),
        fuelType: fuelFromYearName(y.name, y.code),
      };
    });
  }

  async getPrice(brandCode: string, modelCode: string, yearCode: string): Promise<FipeProviderPrice> {
    const data = await this.fetchJson<{ price: string; referenceMonth: string }>(
      `/brands/${brandCode}/models/${modelCode}/years/${yearCode}`,
    );
    const valueCents = Math.round(Number(data.price.replace(/[R$.\s]/g, "").replace(",", ".")) * 100);
    return { valueCents, referenceMonth: normalizeReferenceMonth(data.referenceMonth) };
  }

  private async fetchJson<T>(path: string): Promise<T> {
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(`${this.baseUrl}${path}`);
      if (res.ok) return (await res.json()) as T;
      lastErr = new Error(`FIPE provider: ${res.status} em ${path}`);
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      throw lastErr;
    }
    throw lastErr ?? new Error(`FIPE provider: falha em ${path}`);
  }
}

export function fuelFromYearName(name: string, code: string): string {
  const n = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase();
  if (n.includes("FLEX")) return "FLEX";
  if (n.includes("DIESEL")) return "DIESEL";
  if (n.includes("ALCOOL") || n.includes("ETANOL")) return "ALCOOL";
  if (n.includes("HIBRID")) return "HIBRIDO";
  if (n.includes("ELETR")) return "ELETRICO";
  if (n.includes("GASOLINA")) return "GASOLINA";
  const fuelPart = code.split("-")[1];
  if (fuelPart === "1") return "GASOLINA";
  if (fuelPart === "2") return "ALCOOL";
  if (fuelPart === "3") return "DIESEL";
  return "GASOLINA";
}

/** "agosto de 2026" → "2026-08"; se já vier ISO, mantém. */
export function normalizeReferenceMonth(raw: string): string {
  const iso = raw.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const meses: Record<string, string> = {
    janeiro: "01", fevereiro: "02", marco: "03", abril: "04",
    maio: "05", junho: "06", julho: "07", agosto: "08",
    setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
  };
  const fold = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const year = fold.match(/(\d{4})/)?.[1];
  const month = Object.entries(meses).find(([nome]) => fold.includes(nome))?.[1];
  if (year && month) return `${year}-${month}`;
  return raw;
}

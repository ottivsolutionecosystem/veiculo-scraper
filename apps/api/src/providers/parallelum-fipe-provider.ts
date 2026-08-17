import type { FipeProvider, FipeProviderBrand, FipeProviderModel, FipeProviderYear, FipeProviderPrice } from "./fipe-provider.js";

/**
 * Implementação de exemplo contra a API pública gratuita fipe.parallelum.com.br
 * (sem chave, uso comum em projetos brasileiros). Não foi validada ao vivo
 * nesta sessão — a política de rede da sandbox bloqueia qualquer host
 * externo não listado no allowlist (testei o domínio, 403 no proxy).
 * Estrutural e type-safe; troque por outro provedor implementando a mesma
 * interface se preferir (FipeProvider), sem tocar em src/jobs/fipe-import.ts.
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
      const [yearPart, fuelPart] = y.code.split("-");
      return {
        code: y.code,
        modelYear: Number(yearPart),
        fuelType: fuelPart === "1" ? "GASOLINA" : fuelPart === "2" ? "ALCOOL" : "DIESEL",
      };
    });
  }

  async getPrice(brandCode: string, modelCode: string, yearCode: string): Promise<FipeProviderPrice> {
    const data = await this.fetchJson<{ price: string; referenceMonth: string }>(
      `/brands/${brandCode}/models/${modelCode}/years/${yearCode}`,
    );
    const valueCents = Math.round(Number(data.price.replace(/[R$.\s]/g, "").replace(",", ".")) * 100);
    return { valueCents, referenceMonth: data.referenceMonth };
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) throw new Error(`FIPE provider: ${res.status} em ${path}`);
    return (await res.json()) as T;
  }
}

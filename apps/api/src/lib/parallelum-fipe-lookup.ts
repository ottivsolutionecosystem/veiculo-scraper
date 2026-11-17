/**
 * Consulta FIPE via Parallelum v2 (gratuita, sem chave).
 * Usada pelo proxy público do cascade marca→modelo→ano→preço.
 */

export type FipeVehicleTypePt = "carros" | "motos" | "caminhoes";

const TYPE_PATH: Record<FipeVehicleTypePt, string> = {
  carros: "cars",
  motos: "motorcycles",
  caminhoes: "trucks",
};

const BASE = "https://fipe.parallelum.com.br/api/v2";

export function parallelumTypePath(type: FipeVehicleTypePt): string {
  return TYPE_PATH[type];
}

export function parseBrlToCents(valor: string): number {
  const normalized = valor.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

async function fetchJson<T>(url: string): Promise<T> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.ok) return (await res.json()) as T;
    lastErr = new Error(`FIPE indisponível (${res.status}).`);
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }
    throw lastErr;
  }
  throw lastErr ?? new Error("FIPE indisponível.");
}

export interface FipeLookupOption {
  code: string;
  name: string;
}

export interface FipeLookupPrice {
  code: string;
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  priceCents: number;
  referenceMonth: string;
  vehicleType: FipeVehicleTypePt;
}

export async function lookupBrands(type: FipeVehicleTypePt): Promise<FipeLookupOption[]> {
  const rows = await fetchJson<Array<{ code: string; name: string }>>(
    `${BASE}/${parallelumTypePath(type)}/brands`,
  );
  return rows.map((r) => ({ code: String(r.code), name: r.name }));
}

export async function lookupModels(
  type: FipeVehicleTypePt,
  brandCode: string,
): Promise<FipeLookupOption[]> {
  const rows = await fetchJson<Array<{ code: string; name: string }>>(
    `${BASE}/${parallelumTypePath(type)}/brands/${encodeURIComponent(brandCode)}/models`,
  );
  return rows.map((r) => ({ code: String(r.code), name: r.name }));
}

export async function lookupYears(
  type: FipeVehicleTypePt,
  brandCode: string,
  modelCode: string,
): Promise<FipeLookupOption[]> {
  const rows = await fetchJson<Array<{ code: string; name: string }>>(
    `${BASE}/${parallelumTypePath(type)}/brands/${encodeURIComponent(brandCode)}/models/${encodeURIComponent(modelCode)}/years`,
  );
  return rows.map((r) => ({ code: String(r.code), name: r.name }));
}

export async function lookupPrice(
  type: FipeVehicleTypePt,
  brandCode: string,
  modelCode: string,
  yearCode: string,
): Promise<FipeLookupPrice> {
  const raw = await fetchJson<{
    price: string;
    brand: string;
    model: string;
    modelYear: number;
    fuel: string;
    codeFipe: string;
    referenceMonth: string;
  }>(
    `${BASE}/${parallelumTypePath(type)}/brands/${encodeURIComponent(brandCode)}/models/${encodeURIComponent(modelCode)}/years/${encodeURIComponent(yearCode)}`,
  );

  return {
    code: raw.codeFipe,
    brand: raw.brand,
    model: raw.model,
    modelYear: raw.modelYear,
    fuel: raw.fuel,
    priceCents: parseBrlToCents(raw.price),
    referenceMonth: raw.referenceMonth,
    vehicleType: type,
  };
}

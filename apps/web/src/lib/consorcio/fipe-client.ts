/**
 * Consulta FIPE gratuita.
 * BrasilAPI expõe marcas; o cascade marca→modelo→ano→preço usa a API pública
 * Parallelum (mesma tabela FIPE) enquanto `/fipe/precos` da BrasilAPI estiver
 * indisponível (404/500 em 2026-11).
 */

export type FipeVehicleType = "carros" | "motos" | "caminhoes";

export interface FipeOption {
  code: string;
  name: string;
}

export interface FipePriceResult {
  code: string;
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  priceCents: number;
  referenceMonth: string;
  vehicleType: FipeVehicleType;
}

const BRASIL_API = "https://brasilapi.com.br/api/fipe";
const PARALLELUM = "https://parallelum.com.br/fipe/api/v1";

function parseBrlToCents(valor: string): number {
  const digits = valor.replace(/[^\d]/g, "");
  return Number.parseInt(digits || "0", 10);
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FIPE indisponível (${res.status}). Tente de novo em instantes.`);
  }
  return (await res.json()) as T;
}

/** Marcas — tenta BrasilAPI; cai no Parallelum. */
export async function listFipeBrands(type: FipeVehicleType): Promise<FipeOption[]> {
  try {
    const rows = await getJson<Array<{ nome: string; valor: string }>>(
      `${BRASIL_API}/marcas/v1/${type}`,
    );
    return rows.map((r) => ({ code: String(r.valor), name: r.nome }));
  } catch {
    const rows = await getJson<Array<{ codigo: string; nome: string }>>(
      `${PARALLELUM}/${type}/marcas`,
    );
    return rows.map((r) => ({ code: String(r.codigo), name: r.nome }));
  }
}

export async function listFipeModels(
  type: FipeVehicleType,
  brandCode: string,
): Promise<FipeOption[]> {
  const data = await getJson<{ modelos: Array<{ codigo: number | string; nome: string }> }>(
    `${PARALLELUM}/${type}/marcas/${encodeURIComponent(brandCode)}/modelos`,
  );
  return (data.modelos ?? []).map((m) => ({ code: String(m.codigo), name: m.nome }));
}

export async function listFipeYears(
  type: FipeVehicleType,
  brandCode: string,
  modelCode: string,
): Promise<FipeOption[]> {
  const rows = await getJson<Array<{ codigo: string; nome: string }>>(
    `${PARALLELUM}/${type}/marcas/${encodeURIComponent(brandCode)}/modelos/${encodeURIComponent(modelCode)}/anos`,
  );
  return rows.map((r) => ({ code: String(r.codigo), name: r.nome }));
}

export async function fetchFipePrice(
  type: FipeVehicleType,
  brandCode: string,
  modelCode: string,
  yearCode: string,
): Promise<FipePriceResult> {
  const raw = await getJson<{
    Valor: string;
    Marca: string;
    Modelo: string;
    AnoModelo: number;
    Combustivel: string;
    CodigoFipe: string;
    MesReferencia: string;
  }>(
    `${PARALLELUM}/${type}/marcas/${encodeURIComponent(brandCode)}/modelos/${encodeURIComponent(modelCode)}/anos/${encodeURIComponent(yearCode)}`,
  );

  return {
    code: raw.CodigoFipe,
    brand: raw.Marca,
    model: raw.Modelo,
    modelYear: raw.AnoModelo,
    fuel: raw.Combustivel,
    priceCents: parseBrlToCents(raw.Valor),
    referenceMonth: raw.MesReferencia,
    vehicleType: type,
  };
}

/** Preço direto por código FIPE via BrasilAPI (quando a rota voltar). */
export async function fetchFipePriceByCode(code: string): Promise<FipePriceResult | null> {
  try {
    const rows = await getJson<
      Array<{
        valor: string;
        marca: string;
        modelo: string;
        anoModelo: number;
        combustivel: string;
        codigoFipe: string;
        mesReferencia: string;
      }>
    >(`${BRASIL_API}/precos/v1/${encodeURIComponent(code)}`);
    const raw = rows[0];
    if (!raw) return null;
    return {
      code: raw.codigoFipe,
      brand: raw.marca,
      model: raw.modelo,
      modelYear: raw.anoModelo,
      fuel: raw.combustivel,
      priceCents: parseBrlToCents(raw.valor),
      referenceMonth: raw.mesReferencia,
      vehicleType: "carros",
    };
  } catch {
    return null;
  }
}

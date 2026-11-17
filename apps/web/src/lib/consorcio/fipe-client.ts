/**
 * Cascade FIPE via proxy da nossa API (`/api/fipe/*` → Parallelum no servidor).
 * O browser não fala direto com Parallelum/BrasilAPI.
 */

import { ApiError } from "@/lib/api";
import { resolveApiBase } from "@/lib/api-upstream";
import { API_URL } from "@/lib/env";

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

async function resolveFetchBase(): Promise<string> {
  if (typeof window !== "undefined") return API_URL;
  return resolveApiBase();
}

async function fipeFetch<T>(path: string): Promise<T> {
  const base = await resolveFetchBase();
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const raw = await res.text();
    let message = `FIPE indisponível (${res.status}).`;
    try {
      const body = JSON.parse(raw) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      if (raw) message = raw.slice(0, 180);
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

function withType(type: FipeVehicleType, path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}type=${encodeURIComponent(type)}`;
}

export async function listFipeBrands(type: FipeVehicleType): Promise<FipeOption[]> {
  const data = await fipeFetch<{ items: FipeOption[] }>(withType(type, "/api/fipe/brands"));
  return data.items;
}

export async function listFipeModels(
  type: FipeVehicleType,
  brandCode: string,
): Promise<FipeOption[]> {
  const data = await fipeFetch<{ items: FipeOption[] }>(
    withType(type, `/api/fipe/brands/${encodeURIComponent(brandCode)}/models`),
  );
  return data.items;
}

export async function listFipeYears(
  type: FipeVehicleType,
  brandCode: string,
  modelCode: string,
): Promise<FipeOption[]> {
  const data = await fipeFetch<{ items: FipeOption[] }>(
    withType(
      type,
      `/api/fipe/brands/${encodeURIComponent(brandCode)}/models/${encodeURIComponent(modelCode)}/years`,
    ),
  );
  return data.items;
}

export async function fetchFipePrice(
  type: FipeVehicleType,
  brandCode: string,
  modelCode: string,
  yearCode: string,
): Promise<FipePriceResult> {
  return fipeFetch<FipePriceResult>(
    withType(
      type,
      `/api/fipe/brands/${encodeURIComponent(brandCode)}/models/${encodeURIComponent(modelCode)}/years/${encodeURIComponent(yearCode)}`,
    ),
  );
}

import type { ConsorcioFipeSelection } from "@veiculo/types";

import { env } from "../env.js";

export type PlateLookupConfidence = "alta" | "media" | "baixa";

export interface PlateFipeCandidate extends ConsorcioFipeSelection {
  principal: boolean;
}

export interface PlateLookupResult {
  plate: string;
  confidence: PlateLookupConfidence;
  color: string | null;
  candidates: PlateFipeCandidate[];
}

export interface PlateLookupProvider {
  configured(): boolean;
  lookupByPlate(plate: string): Promise<PlateLookupResult>;
}

type ApiBrasilFipeItem = {
  codigoFipe?: string;
  marca?: string;
  modelo?: string;
  anoModelo?: string | number;
  combustivel?: string;
  mesReferencia?: string;
  valor?: number | string;
  principal?: boolean;
  categoria?: string;
  extra?: { categoria?: { descricao?: string } };
};

type ApiBrasilEnvelope = {
  error?: boolean;
  message?: string;
  data?: {
    confianca?: string;
    data?: ApiBrasilFipeItem[];
    veiculo?: { cor?: string };
  };
};

function mapVehicleType(raw: ApiBrasilFipeItem): ConsorcioFipeSelection["vehicleType"] {
  const cat = (
    raw.extra?.categoria?.descricao ??
    raw.categoria ??
    ""
  )
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (cat.includes("moto")) return "motos";
  if (cat.includes("caminh")) return "caminhoes";
  return "carros";
}

/** Valor APIBrasil costuma vir em reais inteiros (ex.: 102385). */
export function apiBrasilValorToCents(valor: number | string | undefined): number {
  if (valor === undefined || valor === null) return 0;
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? Math.round(valor * 100) : 0;
  }
  const digits = valor.replace(/[^\d]/g, "");
  if (!digits) return 0;
  // "102385" ou "102.385,00" → centavos
  if (valor.includes(",") || valor.toLowerCase().includes("r$")) {
    const normalized = valor.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }
  const asReais = Number(digits);
  return Number.isFinite(asReais) ? asReais * 100 : 0;
}

export function mapApiBrasilFipeResponse(
  plate: string,
  body: ApiBrasilEnvelope,
): PlateLookupResult {
  if (body.error) {
    throw new Error(body.message || "Consulta de placa falhou.");
  }
  const items = body.data?.data ?? [];
  const confidenceRaw = (body.data?.confianca ?? "media").toLowerCase();
  const confidence: PlateLookupConfidence =
    confidenceRaw === "alta" || confidenceRaw === "baixa" ? confidenceRaw : "media";

  const candidates: PlateFipeCandidate[] = items
    .filter((item) => item.codigoFipe && item.marca && item.modelo)
    .map((item) => ({
      code: String(item.codigoFipe),
      brand: String(item.marca).replace(/\s*-\s*/g, " ").trim(),
      model: String(item.modelo),
      modelYear: Number(item.anoModelo) || 0,
      fuel: String(item.combustivel ?? ""),
      priceCents: apiBrasilValorToCents(item.valor),
      referenceMonth: String(item.mesReferencia ?? ""),
      vehicleType: mapVehicleType(item),
      principal: Boolean(item.principal),
    }));

  if (candidates.length === 0) {
    throw new Error("Nenhuma FIPE encontrada para esta placa.");
  }

  if (!candidates.some((c) => c.principal)) {
    candidates[0]!.principal = true;
  }

  return {
    plate,
    confidence,
    color: body.data?.veiculo?.cor?.trim() || null,
    candidates,
  };
}

export class ApiBrasilPlateLookupProvider implements PlateLookupProvider {
  constructor(
    private readonly token: string,
    private readonly homolog: boolean,
    private readonly baseUrl = "https://gateway.apibrasil.io/api/v2",
  ) {}

  configured(): boolean {
    return Boolean(this.token);
  }

  async lookupByPlate(plate: string): Promise<PlateLookupResult> {
    const res = await fetch(`${this.baseUrl}/consulta/veiculos/credits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        tipo: "fipe",
        placa: plate,
        ...(this.homolog ? { homolog: true } : {}),
      }),
    });

    if (res.status === 402) {
      throw new Error("Saldo insuficiente na APIBrasil.");
    }
    if (!res.ok) {
      throw new Error(`Consulta de placa indisponível (${res.status}).`);
    }

    const body = (await res.json()) as ApiBrasilEnvelope;
    return mapApiBrasilFipeResponse(plate, body);
  }
}

export class UnconfiguredPlateLookupProvider implements PlateLookupProvider {
  configured(): boolean {
    return false;
  }

  async lookupByPlate(): Promise<PlateLookupResult> {
    throw new Error("Consulta por placa não configurada (APIBRASIL_TOKEN).");
  }
}

export function createPlateLookupProvider(): PlateLookupProvider {
  if (!env.apiBrasilToken) return new UnconfiguredPlateLookupProvider();
  return new ApiBrasilPlateLookupProvider(env.apiBrasilToken, env.apiBrasilHomolog);
}

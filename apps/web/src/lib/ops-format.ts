import type { OpsKpi } from "@veiculo/types";

import { formatCents } from "@/lib/format";

export function formatOpsValue(kpi: OpsKpi): string {
  if (kpi.unit === "rate") return `${(kpi.value * 100).toFixed(1).replace(".", ",")}%`;
  if (kpi.unit === "pct") return `${kpi.value.toFixed(1).replace(".", ",")}%`;
  if (kpi.unit === "cents") return formatCents(kpi.value);
  if (kpi.unit === "hours") return `${kpi.value.toFixed(1).replace(".", ",")} h`;
  return kpi.value.toLocaleString("pt-BR");
}

export function opsDelta(kpi: OpsKpi): { text: string; up: boolean; zero: boolean } | null {
  if (kpi.previous === null) return null;
  if (kpi.previous === 0) {
    if (kpi.value === 0) return { text: "igual", up: false, zero: true };
    return { text: "novo", up: true, zero: false };
  }
  const pct = ((kpi.value - kpi.previous) / kpi.previous) * 100;
  if (Math.abs(pct) < 0.5) return { text: "igual", up: false, zero: true };
  const up = pct > 0;
  const abs = Math.abs(pct).toFixed(0);
  return { text: `${up ? "+" : "−"}${abs}%`, up, zero: false };
}

export function formatRate(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

export function formatHours(value: number | null): string {
  if (value === null) return "—";
  if (value < 1) return `${Math.round(value * 60)} min`;
  return `${value.toFixed(1).replace(".", ",")} h`;
}

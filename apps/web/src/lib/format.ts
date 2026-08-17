export function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatKm(km: number | null): string {
  if (km === null) return "km não informado";
  return `${km.toLocaleString("pt-BR")} km`;
}

export function formatPct(pct: number | null, digits = 1): string {
  if (pct === null) return "—";
  return `${pct.toFixed(digits)}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function daysAgoLabel(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "1 dia no ar";
  return `${days} dias no ar`;
}

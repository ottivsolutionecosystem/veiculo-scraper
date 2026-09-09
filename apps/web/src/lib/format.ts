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

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Relógio da tratativa: "1h 12min" ou "vencido". */
export function countdownLabel(iso: string | null | undefined, now = Date.now()): {
  overdue: boolean;
  text: string;
} {
  if (!iso) return { overdue: false, text: "sem prazo" };
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return { overdue: true, text: "prazo vencido" };
  const totalMin = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return { overdue: false, text: days === 1 ? "1 dia" : `${days} dias` };
  }
  if (hours === 0) return { overdue: false, text: `${minutes} min` };
  return { overdue: false, text: `${hours}h ${minutes}min` };
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "caiu R$ 3.000" / "subiu R$ 1.200". `null` quando o preço nunca mudou. */
export function priceChangeLabel(changeCents: number | null): string | null {
  if (changeCents === null || changeCents === 0) return null;
  const verbo = changeCents < 0 ? "caiu" : "subiu";
  return `${verbo} ${formatCents(Math.abs(changeCents))}`;
}

/** "Campo Grande/MS". Null quando o anúncio não trouxe nem cidade nem UF. */
export function locationLabel(city: string | null, stateCode: string | null): string | null {
  if (city && stateCode) return `${city}/${stateCode}`;
  return city ?? stateCode ?? null;
}

export function daysAgoLabel(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "1 dia no ar";
  return `${days} dias no ar`;
}

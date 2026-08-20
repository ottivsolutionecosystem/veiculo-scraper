import type { OpsDailyPoint, OpsRange } from "@veiculo/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Início do dia em America/Sao_Paulo (UTC−3, sem horário de verão). */
export function startOfSaoPauloDay(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${parts}T00:00:00.000-03:00`);
}

export function saoPauloDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function periodBounds(
  range: OpsRange,
  now = new Date(),
): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const to = now;
  const startToday = startOfSaoPauloDay(now);
  let from: Date;
  if (range === "today") {
    from = startToday;
  } else if (range === "30d") {
    from = new Date(startToday.getTime() - 29 * DAY_MS);
  } else if (range === "month") {
    const key = saoPauloDayKey(startToday);
    from = new Date(`${key.slice(0, 8)}01T00:00:00.000-03:00`);
  } else {
    from = new Date(startToday.getTime() - 6 * DAY_MS);
  }
  const duration = Math.max(to.getTime() - from.getTime(), DAY_MS);
  return {
    from,
    to,
    prevTo: from,
    prevFrom: new Date(from.getTime() - duration),
  };
}

/** consignou / (consignou + devolveu). Sem encerramento → null. */
export function conversionRate(consigned: number, returned: number): number | null {
  const den = consigned + returned;
  if (den <= 0) return null;
  return consigned / den;
}

/** consignou / assumiu. Sem claim → null. */
export function closeRate(consigned: number, claims: number): number | null {
  if (claims <= 0) return null;
  return consigned / claims;
}

export function deltaRatio(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

const MAX_SERIES_POINTS = 31;

export function fillDailySeries(
  from: Date,
  to: Date,
  rows: { day: string; consigned: number; returned: number; claims: number }[],
): OpsDailyPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: OpsDailyPoint[] = [];
  let start = startOfSaoPauloDay(from);
  const end = startOfSaoPauloDay(to);
  const span = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (span > MAX_SERIES_POINTS) {
    start = new Date(end.getTime() - (MAX_SERIES_POINTS - 1) * DAY_MS);
  }
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    const day = saoPauloDayKey(new Date(t));
    const hit = byDay.get(day);
    out.push({
      day,
      consigned: hit?.consigned ?? 0,
      returned: hit?.returned ?? 0,
      claims: hit?.claims ?? 0,
    });
  }
  return out;
}

export function hoursFromSeconds(secs: number | null): number | null {
  if (secs === null || !Number.isFinite(secs)) return null;
  return secs / 3600;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Início do dia YYYY-MM-DD em Brasília, ou instante ISO. */
export function parseSpStart(raw: string): Date | null {
  if (ISO_DAY.test(raw)) return new Date(`${raw}T00:00:00.000-03:00`);
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Fim exclusivo do dia YYYY-MM-DD em Brasília, ou instante ISO. */
export function parseSpEndExclusive(raw: string): Date | null {
  if (ISO_DAY.test(raw)) {
    const start = new Date(`${raw}T00:00:00.000-03:00`);
    return new Date(start.getTime() + DAY_MS);
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolvePeriod(
  input: { range?: OpsRange; from?: string; to?: string },
  now = new Date(),
): { from: Date; to: Date; prevFrom: Date; prevTo: Date; range: OpsRange } {
  if (input.from && input.to) {
    const from = parseSpStart(input.from);
    const end = parseSpEndExclusive(input.to);
    if (!from || !end || !(from.getTime() < end.getTime())) {
      return { ...periodBounds(input.range ?? "7d", now), range: input.range ?? "7d" };
    }
    const to = new Date(Math.min(end.getTime(), now.getTime()));
    const duration = Math.max(to.getTime() - from.getTime(), DAY_MS);
    return {
      from,
      to,
      prevTo: from,
      prevFrom: new Date(from.getTime() - duration),
      range: input.range ?? "7d",
    };
  }
  const range = input.range ?? "7d";
  return { ...periodBounds(range, now), range };
}

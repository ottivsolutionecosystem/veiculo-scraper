import { describe, expect, it } from "vitest";

import {
  closeRate,
  conversionRate,
  deltaRatio,
  fillDailySeries,
  periodBounds,
  resolvePeriod,
  saoPauloDayKey,
  startOfSaoPauloDay,
} from "./ops.js";

describe("taxas do dashboard", () => {
  it("conversão é consignou sobre encerramentos", () => {
    expect(conversionRate(1, 9)).toBe(0.1);
    expect(conversionRate(0, 0)).toBeNull();
    expect(conversionRate(4, 0)).toBe(1);
  });

  it("fechamento é consignou sobre claims", () => {
    expect(closeRate(2, 10)).toBe(0.2);
    expect(closeRate(1, 0)).toBeNull();
  });

  it("variação é relativa ao período anterior", () => {
    expect(deltaRatio(10, 8)).toBeCloseTo(0.25);
    expect(deltaRatio(0, 0)).toBe(0);
    expect(deltaRatio(5, 0)).toBeNull();
  });
});

describe("período", () => {
  const agora = new Date("2026-08-18T15:00:00-03:00");

  it("hoje começa à meia-noite de Brasília", () => {
    const { from, to } = periodBounds("today", agora);
    expect(saoPauloDayKey(from)).toBe("2026-08-18");
    expect(from.getTime()).toBe(startOfSaoPauloDay(agora).getTime());
    expect(to.getTime()).toBe(agora.getTime());
  });

  it("7d inclui hoje e mais 6 dias", () => {
    const { from } = periodBounds("7d", agora);
    expect(saoPauloDayKey(from)).toBe("2026-08-12");
  });
});

describe("série diária", () => {
  it("preenche dias sem evento com zero", () => {
    const from = new Date("2026-08-16T00:00:00.000-03:00");
    const to = new Date("2026-08-18T12:00:00.000-03:00");
    const series = fillDailySeries(from, to, [{ day: "2026-08-17", consigned: 2, returned: 1, claims: 3 }]);
    expect(series.map((p) => p.day)).toEqual(["2026-08-16", "2026-08-17", "2026-08-18"]);
    expect(series[0]).toEqual({ day: "2026-08-16", consigned: 0, returned: 0, claims: 0 });
    expect(series[1]?.consigned).toBe(2);
  });
});

describe("intervalo customizado", () => {
  it("lê YYYY-MM-DD em Brasília e compara com o período anterior de mesma duração", () => {
    const agora = new Date("2026-08-18T15:00:00-03:00");
    const p = resolvePeriod({ from: "2026-08-11", to: "2026-08-18" }, agora);
    expect(saoPauloDayKey(p.from)).toBe("2026-08-11");
    expect(p.to.getTime()).toBe(agora.getTime());
    expect(p.prevTo.getTime()).toBe(p.from.getTime());
    expect(p.to.getTime() - p.from.getTime()).toBe(p.prevTo.getTime() - p.prevFrom.getTime());
  });
});

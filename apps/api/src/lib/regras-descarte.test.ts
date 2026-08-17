import { describe, expect, it } from "vitest";

import { assertHasDiscardReason, shouldReturnFromDiscard } from "./regras-descarte.js";

describe("assertHasDiscardReason", () => {
  it("aceita motivo preenchido", () => {
    expect(() => assertHasDiscardReason("Preço fora da faixa")).not.toThrow();
  });

  it("rejeita motivo vazio ou só espaço", () => {
    expect(() => assertHasDiscardReason("")).toThrow();
    expect(() => assertHasDiscardReason("   ")).toThrow();
    expect(() => assertHasDiscardReason(null)).toThrow();
    expect(() => assertHasDiscardReason(undefined)).toThrow();
  });
});

describe("shouldReturnFromDiscard", () => {
  const discardedAt = new Date("2026-07-01T00:00:00Z");

  it("sem gatilho, descarte é permanente", () => {
    expect(
      shouldReturnFromDiscard(null, {
        priceAtDiscardCents: 10_000_00,
        currentPriceCents: 1,
        discardedAt,
        now: new Date("2030-01-01T00:00:00Z"),
      }),
    ).toBe(false);
  });

  it("queda de preço abaixo do gatilho não volta", () => {
    const volta = shouldReturnFromDiscard(
      { kind: "price_drop", value: 7 },
      { priceAtDiscardCents: 10_000_00, currentPriceCents: 9_700_00, discardedAt, now: discardedAt },
    );
    expect(volta).toBe(false);
  });

  it("queda de preço no limiar ou acima volta", () => {
    const volta = shouldReturnFromDiscard(
      { kind: "price_drop", value: 7 },
      { priceAtDiscardCents: 10_000_00, currentPriceCents: 9_300_00, discardedAt, now: discardedAt },
    );
    expect(volta).toBe(true);
  });

  it("prazo corrido volta mesmo sem queda de preço", () => {
    const volta = shouldReturnFromDiscard(
      { kind: "days_elapsed", value: 30 },
      {
        priceAtDiscardCents: 10_000_00,
        currentPriceCents: 10_000_00,
        discardedAt,
        now: new Date("2026-07-31T00:00:00Z"),
      },
    );
    expect(volta).toBe(true);
  });

  it("prazo ainda não corrido não volta", () => {
    const volta = shouldReturnFromDiscard(
      { kind: "days_elapsed", value: 30 },
      {
        priceAtDiscardCents: 10_000_00,
        currentPriceCents: 10_000_00,
        discardedAt,
        now: new Date("2026-07-15T00:00:00Z"),
      },
    );
    expect(volta).toBe(false);
  });
});

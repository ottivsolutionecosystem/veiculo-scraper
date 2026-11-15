import { describe, expect, it } from "vitest";

import { MIN_OVERFLOW_TO_HIDE, reduceHideOnScroll } from "./hide-on-scroll";

const base = { hidden: false, accumulated: 0 };

describe("reduceHideOnScroll", () => {
  it("não esconde quando a lista quase não tem overflow", () => {
    const next = reduceHideOnScroll(base, {
      scrollTop: 40,
      delta: 20,
      overflow: MIN_OVERFLOW_TO_HIDE - 1,
    });
    expect(next.hidden).toBe(false);
    expect(next.accumulated).toBe(0);
  });

  it("força revelar se o overflow sumiu com o chrome escondido", () => {
    const next = reduceHideOnScroll(
      { hidden: true, accumulated: 0 },
      { scrollTop: 80, delta: 10, overflow: 20 },
    );
    expect(next.hidden).toBe(false);
  });

  it("esconde ao descer com overflow suficiente", () => {
    const mid = reduceHideOnScroll(base, {
      scrollTop: 40,
      delta: 10,
      overflow: MIN_OVERFLOW_TO_HIDE + 40,
    });
    const next = reduceHideOnScroll(mid, {
      scrollTop: 56,
      delta: 16,
      overflow: MIN_OVERFLOW_TO_HIDE + 40,
    });
    expect(next.hidden).toBe(true);
  });
});

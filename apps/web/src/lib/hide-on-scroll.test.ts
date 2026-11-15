import { describe, expect, it } from "vitest";

import { FAST_DELTA, MIN_OVERFLOW_TO_HIDE, reduceHideOnScroll } from "./hide-on-scroll";

const base = { hidden: false, accumulated: 0 };
const overflow = MIN_OVERFLOW_TO_HIDE + 40;

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
      overflow,
    });
    const next = reduceHideOnScroll(mid, {
      scrollTop: 56,
      delta: 16,
      overflow,
    });
    expect(next.hidden).toBe(true);
  });

  it("fling rápido para baixo esconde num único evento", () => {
    const next = reduceHideOnScroll(base, {
      scrollTop: 200,
      delta: FAST_DELTA,
      overflow,
    });
    expect(next.hidden).toBe(true);
    expect(next.accumulated).toBe(0);
  });

  it("não revela no bounce pequeno no meio do fling", () => {
    const next = reduceHideOnScroll(
      { hidden: true, accumulated: 0 },
      { scrollTop: 400, delta: -20, overflow },
    );
    expect(next.hidden).toBe(true);
  });

  it("revela ao subir de verdade com chrome escondido", () => {
    const mid = reduceHideOnScroll(
      { hidden: true, accumulated: 0 },
      { scrollTop: 400, delta: -30, overflow },
    );
    const next = reduceHideOnScroll(mid, {
      scrollTop: 340,
      delta: -30,
      overflow,
    });
    expect(next.hidden).toBe(false);
  });
});

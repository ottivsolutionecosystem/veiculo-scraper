import { describe, expect, it } from "vitest";

import { COLLECTOR_STALE_MS, scrapePhase } from "./scrape-status.js";

const t0 = Date.parse("2026-08-20T18:16:00.000Z");

describe("scrapePhase", () => {
  it("queued nos primeiros segundos sem o coletor ter pego", () => {
    expect(
      scrapePhase({
        requestedAt: "2026-08-20T18:16:00.000Z",
        startedAt: null,
        hasProgress: false,
        now: t0 + 15_000,
      }),
    ).toBe("queued");
  });

  it("stale se passou do prazo e iniciado_em continua nulo", () => {
    expect(
      scrapePhase({
        requestedAt: "2026-08-20T18:16:00.000Z",
        startedAt: null,
        hasProgress: false,
        now: t0 + COLLECTOR_STALE_MS,
      }),
    ).toBe("stale");
  });

  it("started quando o coletor pegou mas ainda não gravou progresso", () => {
    expect(
      scrapePhase({
        requestedAt: "2026-08-20T18:16:00.000Z",
        startedAt: "2026-08-20T18:16:20.000Z",
        hasProgress: false,
        now: t0 + 10 * 60_000,
      }),
    ).toBe("started");
  });

  it("running com progresso, mesmo depois de muito tempo", () => {
    expect(
      scrapePhase({
        requestedAt: "2026-08-20T18:16:00.000Z",
        startedAt: "2026-08-20T18:16:20.000Z",
        hasProgress: true,
        now: t0 + 40 * 60_000,
      }),
    ).toBe("running");
  });
});

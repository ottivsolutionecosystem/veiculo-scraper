import { describe, expect, it } from "vitest";

import { chooseAnuncioPrincipal } from "./dedupe.js";

describe("chooseAnuncioPrincipal", () => {
  it("prefere o anúncio com menos pendências", () => {
    const escolhido = chooseAnuncioPrincipal([
      { id: 1, pendingFieldsCount: 2, lastSeenAt: "2026-08-10T00:00:00Z" },
      { id: 2, pendingFieldsCount: 0, lastSeenAt: "2026-08-01T00:00:00Z" },
    ]);
    expect(escolhido.id).toBe(2);
  });

  it("em empate de pendências, prefere o visto mais recentemente", () => {
    const escolhido = chooseAnuncioPrincipal([
      { id: 1, pendingFieldsCount: 1, lastSeenAt: "2026-08-01T00:00:00Z" },
      { id: 2, pendingFieldsCount: 1, lastSeenAt: "2026-08-10T00:00:00Z" },
    ]);
    expect(escolhido.id).toBe(2);
  });

  it("em empate total, é determinístico pelo menor id", () => {
    const escolhido = chooseAnuncioPrincipal([
      { id: 5, pendingFieldsCount: 0, lastSeenAt: "2026-08-10T00:00:00Z" },
      { id: 3, pendingFieldsCount: 0, lastSeenAt: "2026-08-10T00:00:00Z" },
    ]);
    expect(escolhido.id).toBe(3);
  });

  it("lista de um único anúncio devolve ele mesmo", () => {
    const escolhido = chooseAnuncioPrincipal([
      { id: 7, pendingFieldsCount: 3, lastSeenAt: "2026-08-10T00:00:00Z" },
    ]);
    expect(escolhido.id).toBe(7);
  });

  it("lista vazia lança erro — não devolve um principal inventado", () => {
    expect(() => chooseAnuncioPrincipal([])).toThrow();
  });
});

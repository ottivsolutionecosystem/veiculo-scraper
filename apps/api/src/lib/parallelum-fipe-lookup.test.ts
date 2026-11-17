import { describe, expect, it } from "vitest";

import { parallelumTypePath, parseBrlToCents } from "./parallelum-fipe-lookup.js";

describe("parallelum-fipe-lookup", () => {
  it("mapeia tipo PT → path Parallelum", () => {
    expect(parallelumTypePath("carros")).toBe("cars");
    expect(parallelumTypePath("motos")).toBe("motorcycles");
    expect(parallelumTypePath("caminhoes")).toBe("trucks");
  });

  it("converte BRL FIPE em centavos", () => {
    expect(parseBrlToCents("R$ 119.329,00")).toBe(11_932_900);
    expect(parseBrlToCents("R$ 45.000,50")).toBe(4_500_050);
  });
});

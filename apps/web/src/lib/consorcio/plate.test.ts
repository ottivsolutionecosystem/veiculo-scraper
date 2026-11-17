import { describe, expect, it } from "vitest";

import { formatPlate, isValidPlate, normalizePlate } from "./plate";

describe("placa", () => {
  it("normaliza e formata", () => {
    expect(normalizePlate("abc1d23")).toBe("ABC1D23");
    expect(formatPlate("abc1234")).toBe("ABC-1234");
  });

  it("aceita antiga e Mercosul", () => {
    expect(isValidPlate("ABC1234")).toBe(true);
    expect(isValidPlate("ABC1D23")).toBe(true);
    expect(isValidPlate("AB")).toBe(false);
  });
});

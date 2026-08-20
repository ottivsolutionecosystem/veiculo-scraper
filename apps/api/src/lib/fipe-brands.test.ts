import { describe, expect, it } from "vitest";

import { brandQueryNames, brandsCompatible, canonicalBrand } from "./fipe-brands.js";

describe("canonicalBrand", () => {
  it("unifica GM / Chevrolet / GM - Chevrolet", () => {
    expect(canonicalBrand("CHEVROLET")).toBe("CHEVROLET");
    expect(canonicalBrand("GM")).toBe("CHEVROLET");
    expect(canonicalBrand("GM - Chevrolet")).toBe("CHEVROLET");
  });

  it("unifica VW e Volkswagen", () => {
    expect(canonicalBrand("VW - Volkswagen")).toBe("VOLKSWAGEN");
    expect(canonicalBrand("VW")).toBe("VOLKSWAGEN");
  });
});

describe("brandsCompatible", () => {
  it("casa coletor CHEVROLET com FIPE oficial", () => {
    expect(brandsCompatible("CHEVROLET", "GM - Chevrolet")).toBe(true);
    expect(brandsCompatible("TOYOTA", "Toyota")).toBe(true);
    expect(brandsCompatible("TOYOTA", "CHEVROLET")).toBe(false);
  });
});

describe("brandQueryNames", () => {
  it("devolve grafias em maiúsculas para o SQL", () => {
    expect(brandQueryNames("CHEVROLET")).toEqual(expect.arrayContaining(["CHEVROLET", "GM", "GM CHEVROLET"]));
  });
});

import { describe, expect, it } from "vitest";

import {
  isShopcarFamilySource,
  isShopcarPartnerSource,
  SHOPCAR_PARTNER_SOURCES,
} from "./shopcar-family.js";

describe("shopcar-family", () => {
  it("reconhece marketplace e parceiros", () => {
    expect(isShopcarFamilySource("shopcar")).toBe(true);
    expect(isShopcarFamilySource("teca")).toBe(true);
    expect(isShopcarFamilySource("olx")).toBe(false);
    expect(isShopcarPartnerSource("p12")).toBe(true);
    expect(isShopcarPartnerSource("shopcar")).toBe(false);
    expect(SHOPCAR_PARTNER_SOURCES).toEqual(["teca", "barbosa", "p12"]);
  });
});

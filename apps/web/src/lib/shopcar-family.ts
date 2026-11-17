/** Espelho de apps/api/src/lib/shopcar-family.ts — fontes com HTML Shopcar. */
export const SHOPCAR_MARKET_SOURCE = "shopcar";

export const SHOPCAR_PARTNER_SOURCES = ["teca", "barbosa", "p12"] as const;

export type ShopcarPartnerSource = (typeof SHOPCAR_PARTNER_SOURCES)[number];

export const SHOPCAR_FAMILY_SOURCES = [SHOPCAR_MARKET_SOURCE, ...SHOPCAR_PARTNER_SOURCES] as const;

export type ShopcarFamilySource = (typeof SHOPCAR_FAMILY_SOURCES)[number];

/** Vitrine pública no Shopcar (loja.php) — preenchida quando conhecida. */
export const SHOPCAR_PARTNER_STOREFRONT: Partial<Record<ShopcarPartnerSource, string>> = {
  barbosa: "https://www.shopcar.com.br/loja.php?loja=1847",
};

export function isShopcarFamilySource(source: string): source is ShopcarFamilySource {
  return (SHOPCAR_FAMILY_SOURCES as readonly string[]).includes(source);
}

export function isShopcarPartnerSource(source: string): source is ShopcarPartnerSource {
  return (SHOPCAR_PARTNER_SOURCES as readonly string[]).includes(source);
}

export function partnerStorefrontUrl(source: string): string {
  if (!isShopcarPartnerSource(source)) return "";
  return SHOPCAR_PARTNER_STOREFRONT[source] ?? "";
}

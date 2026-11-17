import { describe, expect, it } from "vitest";

import { buildShopcarListingUrlRange, parseShopcarListingUrls } from "./listing-ingest";

describe("listing-ingest URLs", () => {
  it("aceita vitrine de loja fora de busca.php", () => {
    const urls = parseShopcarListingUrls(
      "https://www.shopcar.com.br/loja/teca-automoveis?pagina=2",
    );
    expect(urls).toHaveLength(1);
    expect(urls[0]?.page).toBe(2);
  });

  it("monta intervalo preservando o path colado", () => {
    const range = buildShopcarListingUrlRange(
      "https://www.shopcar.com.br/busca.php?tipo=1&loja=123",
      1,
      2,
    );
    expect(range).toHaveLength(2);
    expect(range[0]?.url).toContain("loja=123");
    expect(range[0]?.url).toContain("pagina=1");
    expect(range[1]?.url).toContain("pagina=2");
  });
});

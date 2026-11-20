import { describe, expect, it } from "vitest";

import { upgradeListingPhotoUrl, upgradeListingPhotos } from "./listing-photos.js";

describe("upgradeListingPhotoUrl", () => {
  it("remove redim do CDN Shopcar (s3)", () => {
    expect(
      upgradeListingPhotoUrl(
        "https://cdn.shopcar.com.br/redim/135/s3/veiculos/1623997/foto.jpg",
      ),
    ).toBe("https://cdn.shopcar.com.br/s3/veiculos/1623997/foto.jpg");
  });

  it("remove redim do CDN Shopcar (stored)", () => {
    expect(
      upgradeListingPhotoUrl(
        "https://cdn.shopcar.com.br/redim/270/stored/veiculos/particular/a.jpg",
      ),
    ).toBe("https://cdn.shopcar.com.br/stored/veiculos/particular/a.jpg");
  });

  it("não altera URL já em tamanho cheio", () => {
    const full = "https://cdn.shopcar.com.br/stored/veiculos/a.jpg";
    expect(upgradeListingPhotoUrl(full)).toBe(full);
  });

  it("não altera outras origens", () => {
    const other = "https://exemplo.com/redim/135/foto.jpg";
    expect(upgradeListingPhotoUrl(other)).toBe(other);
  });
});

describe("upgradeListingPhotos", () => {
  it("mapeia lista e ignora inválidos", () => {
    expect(
      upgradeListingPhotos([
        "https://cdn.shopcar.com.br/redim/135/s3/veiculos/x.jpg",
        "",
        null,
        "https://cdn.shopcar.com.br/s3/veiculos/y.jpg",
      ]),
    ).toEqual([
      "https://cdn.shopcar.com.br/s3/veiculos/x.jpg",
      "https://cdn.shopcar.com.br/s3/veiculos/y.jpg",
    ]);
  });

  it("descarta logo do site e deduplica", () => {
    expect(
      upgradeListingPhotos([
        "https://cdn.shopcar.com.br/images/logo.png",
        "https://cdn.shopcar.com.br/stored/veiculos/a.jpg",
        "https://cdn.shopcar.com.br/stored/veiculos/a.jpg",
        "https://cdn.shopcar.com.br/stored/lojas/99.png",
      ]),
    ).toEqual(["https://cdn.shopcar.com.br/stored/veiculos/a.jpg"]);
  });
});

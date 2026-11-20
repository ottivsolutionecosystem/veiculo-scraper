import { describe, expect, it } from "vitest";
import sharp from "sharp";

import {
  PHOTO_BRAND_BAR_RATIO,
  PHOTO_BRAND_LOGO_HEIGHT_RATIO,
  PHOTO_BRAND_LOGO_MAX_WIDTH_RATIO,
  PHOTO_BRAND_PAD_X_RATIO,
  brandBarLayout,
  brandPhotoBuffer,
} from "./photo-brand.js";

describe("brandBarLayout", () => {
  it("usa ~20% da altura como faixa (corta a marca da base)", () => {
    const layout = brandBarLayout(1000, 750);
    expect(layout.barHeight).toBe(Math.round(750 * PHOTO_BRAND_BAR_RATIO));
    expect(layout.contentHeight).toBe(750 - layout.barHeight);
    expect(layout.logoTop).toBe(layout.contentHeight);
  });

  it("posiciona padding e logo relativos à largura/faixa", () => {
    const layout = brandBarLayout(1600, 1200);
    expect(layout.padX).toBe(Math.round(1600 * PHOTO_BRAND_PAD_X_RATIO));
    expect(layout.logoHeight).toBe(Math.round(layout.barHeight * PHOTO_BRAND_LOGO_HEIGHT_RATIO));
    expect(layout.logoMaxWidth).toBe(Math.round(1600 * PHOTO_BRAND_LOGO_MAX_WIDTH_RATIO));
  });

  it("não zera dimensões em imagem mínima", () => {
    const layout = brandBarLayout(8, 8);
    expect(layout.barHeight).toBeGreaterThanOrEqual(1);
    expect(layout.contentHeight).toBeGreaterThanOrEqual(1);
    expect(layout.barHeight + layout.contentHeight).toBe(8);
    expect(layout.logoHeight).toBeGreaterThanOrEqual(1);
  });
});

describe("brandPhotoBuffer", () => {
  it("substitui a base por navy — pixels originais da faixa somem", async () => {
    // Base vermelha (simula marca): se a tarja não cortar, a amostra na base continua vermelha.
    const input = await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 3,
        background: { r: 220, g: 30, b: 30 },
      },
    })
      .jpeg()
      .toBuffer();

    const out = await brandPhotoBuffer(input);
    const { data, info } = await sharp(out)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const layout = brandBarLayout(info.width, info.height);
    // Amostra no meio da faixa Auttus (não no logo): deve ser navy, não vermelho.
    const x = Math.floor(info.width * 0.7);
    const y = layout.contentHeight + Math.floor(layout.barHeight / 2);
    const idx = (y * info.width + x) * info.channels;
    const r = data[idx]!;
    const g = data[idx + 1]!;
    const b = data[idx + 2]!;

    expect(r).toBeLessThan(40);
    expect(g).toBeLessThan(40);
    expect(b).toBeLessThan(60);
    // Não pode permanecer o vermelho da “marca” simulada.
    expect(r).toBeLessThan(100);
  });
});

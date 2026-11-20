import { describe, expect, it } from "vitest";
import sharp from "sharp";

import {
  PHOTO_BRAND_BAR_MAX_PX,
  PHOTO_BRAND_BAR_MIN_PX,
  PHOTO_BRAND_BAR_RATIO,
  PHOTO_BRAND_LOGO_HEIGHT_RATIO,
  PHOTO_BRAND_LOGO_MAX_WIDTH_RATIO,
  PHOTO_BRAND_PAD_X_RATIO,
  brandBarLayout,
  brandPhotoBuffer,
} from "./photo-brand.js";

describe("brandBarLayout", () => {
  it("usa ~8% com teto e piso em px — não come a foto", () => {
    const layout = brandBarLayout(1000, 750);
    const expected = Math.max(
      PHOTO_BRAND_BAR_MIN_PX,
      Math.min(PHOTO_BRAND_BAR_MAX_PX, Math.round(750 * PHOTO_BRAND_BAR_RATIO)),
    );
    expect(layout.barHeight).toBe(expected);
    expect(layout.barHeight).toBeLessThanOrEqual(PHOTO_BRAND_BAR_MAX_PX);
    expect(layout.contentHeight).toBe(750 - layout.barHeight);
  });

  it("em imagem alta o teto evita faixa gigante", () => {
    const layout = brandBarLayout(2400, 1800);
    expect(layout.barHeight).toBe(PHOTO_BRAND_BAR_MAX_PX);
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
  });
});

describe("brandPhotoBuffer", () => {
  it("pinta a base de navy sem apagar o restante", async () => {
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
    // Meio da foto (acima da faixa) continua vermelho.
    const midY = Math.floor(layout.contentHeight / 2);
    const midIdx = (midY * info.width + 100) * info.channels;
    expect(data[midIdx]!).toBeGreaterThan(150);

    // Faixa inferior é navy.
    const x = Math.floor(info.width * 0.7);
    const y = layout.contentHeight + Math.floor(layout.barHeight / 2);
    const idx = (y * info.width + x) * info.channels;
    expect(data[idx]!).toBeLessThan(40);
    expect(data[idx + 1]!).toBeLessThan(40);
  });
});

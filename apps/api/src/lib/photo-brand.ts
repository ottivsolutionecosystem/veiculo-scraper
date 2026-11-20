import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

/**
 * Espelha apps/web/src/lib/photo-brand.ts — manter em sync.
 * ~8% na base: tapa Shopcar sem comer o carro (antes 20% era demais).
 */
export const PHOTO_BRAND_BAR_RATIO = 0.08;
export const PHOTO_BRAND_BAR_MIN_PX = 36;
export const PHOTO_BRAND_BAR_MAX_PX = 72;
export const PHOTO_BRAND_PAD_X_RATIO = 0.03;
export const PHOTO_BRAND_LOGO_HEIGHT_RATIO = 0.5;
export const PHOTO_BRAND_LOGO_MAX_WIDTH_RATIO = 0.32;

/** hsl(215 58% 9%) = navy-deep da UI. */
export const PHOTO_BRAND_BAR_COLOR = { r: 10, g: 21, b: 36 };

export interface BrandBarLayout {
  barHeight: number;
  contentHeight: number;
  padX: number;
  logoHeight: number;
  logoMaxWidth: number;
  logoTop: number;
}

export function brandBarLayout(width: number, height: number): BrandBarLayout {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const raw = Math.round(h * PHOTO_BRAND_BAR_RATIO);
  const barHeight =
    h <= 1
      ? 1
      : Math.max(
          1,
          Math.min(h - 1, Math.max(PHOTO_BRAND_BAR_MIN_PX, Math.min(PHOTO_BRAND_BAR_MAX_PX, raw))),
        );
  const contentHeight = Math.max(1, h - barHeight);
  const padX = Math.max(0, Math.round(w * PHOTO_BRAND_PAD_X_RATIO));
  const logoHeight = Math.max(1, Math.round(barHeight * PHOTO_BRAND_LOGO_HEIGHT_RATIO));
  const logoMaxWidth = Math.max(1, Math.round(w * PHOTO_BRAND_LOGO_MAX_WIDTH_RATIO));
  return {
    barHeight,
    contentHeight,
    padX,
    logoHeight,
    logoMaxWidth,
    logoTop: contentHeight,
  };
}

let wordmarkCache: Buffer | null = null;

async function resolveWordmarkPath(): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, "../../assets/brand/logo-wordmark-on-dark.png"),
    path.join(here, "../../../assets/brand/logo-wordmark-on-dark.png"),
    path.join(process.cwd(), "assets/brand/logo-wordmark-on-dark.png"),
    path.join(process.cwd(), "apps/api/assets/brand/logo-wordmark-on-dark.png"),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      /* próximo */
    }
  }
  throw new Error("Wordmark Auttus não encontrado nos assets da API.");
}

async function loadWordmark(): Promise<Buffer> {
  if (!wordmarkCache) wordmarkCache = await readFile(await resolveWordmarkPath());
  return wordmarkCache;
}

/**
 * Pinta a faixa Auttus na base (sem cortar 20% do carro).
 * Cobre a marca Shopcar típica na faixa inferior.
 */
export async function brandPhotoBuffer(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input, { failOn: "none" }).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 1 || height < 1) {
    throw new Error("Imagem sem dimensões.");
  }

  const layout = brandBarLayout(width, height);
  const wordmark = await loadWordmark();
  const logo = await sharp(wordmark)
    .resize({
      height: layout.logoHeight,
      width: layout.logoMaxWidth,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  const bar = await sharp({
    create: {
      width,
      height: layout.barHeight,
      channels: 3,
      background: PHOTO_BRAND_BAR_COLOR,
    },
  })
    .png()
    .toBuffer();

  const logoTop =
    layout.logoTop + Math.max(0, Math.round((layout.barHeight - logo.info.height) / 2));

  return sharp(input, { failOn: "none" })
    .composite([
      { input: bar, top: layout.logoTop, left: 0 },
      { input: logo.data, top: logoTop, left: layout.padX },
    ])
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

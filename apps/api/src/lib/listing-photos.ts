/**
 * Shopcar guarda miniatura em `/redim/{px}/…` (ex.: 135px).
 * A URL original é a mesma sem o segmento `redim/N`.
 */
export function upgradeListingPhotoUrl(url: string): string {
  return url.replace(/^(https?:\/\/cdn\.shopcar\.com\.br)\/redim\/\d+\//i, "$1/");
}

/** Logo do site / assets de loja não são foto do veículo. */
export function isVehiclePhotoUrl(url: string): boolean {
  return !/\/images\/(?:logo|anunciante)|\/stored\/lojas\/|\/favicon|\/sprite/i.test(url);
}

export function upgradeListingPhotos(photos: unknown): string[] {
  if (!Array.isArray(photos)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of photos) {
    if (typeof p !== "string" || p.length === 0) continue;
    const upgraded = upgradeListingPhotoUrl(p);
    if (!isVehiclePhotoUrl(upgraded) || seen.has(upgraded)) continue;
    seen.add(upgraded);
    out.push(upgraded);
  }
  return out;
}

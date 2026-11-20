/**
 * Shopcar guarda miniatura em `/redim/{px}/…` (ex.: 135px).
 * A URL original é a mesma sem o segmento `redim/N`.
 */
export function upgradeListingPhotoUrl(url: string): string {
  return url.replace(/^(https?:\/\/cdn\.shopcar\.com\.br)\/redim\/\d+\//i, "$1/");
}

export function upgradeListingPhotos(photos: unknown): string[] {
  if (!Array.isArray(photos)) return [];
  return photos
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .map(upgradeListingPhotoUrl);
}

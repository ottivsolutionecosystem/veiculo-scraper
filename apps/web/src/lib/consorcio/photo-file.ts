/** Redimensiona imagem pra data URL (sem storage remoto).
 * Mantém proporção; só reduz se passar do lado máximo. */

/** Lado maior — suficiente pra retina em cards ~400px e galeria. */
const MAX_EDGE = 1600;
/** JPEG: nitidez boa sem estourar o PATCH (bodyLimit 16MB). */
const QUALITY = 0.82;

export async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", QUALITY);
}

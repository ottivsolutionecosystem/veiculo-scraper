import JSZip from "jszip";

import { brandPhotoBuffer } from "./photo-brand.js";

const FETCH_TIMEOUT_MS = 25_000;
const MAX_PHOTOS = 40;

export async function fetchPhotoBuffer(url: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "AuttusPhotoExport/1.0" },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`Falha ao baixar foto (${res.status}).`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

/** Baixa cada URL, remove a base com marca Shopcar, aplica Auttus e monta ZIP. */
export async function buildBrandedPhotosZip(photos: string[]): Promise<Buffer> {
  const urls = photos.filter((u) => typeof u === "string" && u.length > 0).slice(0, MAX_PHOTOS);
  if (urls.length === 0) {
    throw new Error("Veículo sem fotos para exportar.");
  }

  const zip = new JSZip();
  let ok = 0;
  const errors: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!;
    const name = `foto-${String(i + 1).padStart(2, "0")}.jpg`;
    try {
      const raw = await fetchPhotoBuffer(url);
      const branded = await brandPhotoBuffer(raw);
      zip.file(name, branded);
      ok += 1;
    } catch (err) {
      errors.push(`${name}: ${(err as Error).message}`);
    }
  }

  if (ok === 0) {
    throw new Error(errors[0] ?? "Nenhuma foto pôde ser exportada.");
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

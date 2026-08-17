/**
 * Fotos como data URI (SVG inline). Zero chamada de rede — critério de
 * aceite da Fase 1 (seção 17 do SPEC): nenhuma imagem remota.
 */
const PALETTE = ["1e3a5f", "2d6a4f", "7c2d12", "4c1d95", "78350f", "134e4a", "581c87", "164e63"];

export function mockPhoto(seed: number, label: string): string {
  const color = PALETTE[seed % PALETTE.length];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='480'>` +
    `<rect width='640' height='480' fill='#${color}'/>` +
    `<text x='50%' y='50%' font-family='sans-serif' font-size='26' fill='white' ` +
    `text-anchor='middle' dominant-baseline='middle'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function mockPhotos(seed: number, label: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => mockPhoto(seed + i, label));
}

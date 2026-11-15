/**
 * Carroceria não tem coluna em `anuncios` (o coletor descarta a categoria
 * Shopcar do título). Filtramos por tokens no título/modelo até existir
 * campo persistido — decisão reversível documentada no RELATORIO.
 */
export const BODY_TYPES = [
  "hatch",
  "sedan",
  "suv",
  "picape",
  "utilitario",
  "van",
  "conversivel",
] as const;

export type BodyType = (typeof BODY_TYPES)[number];

const PATTERNS: Record<BodyType, readonly string[]> = {
  hatch: ["%HATCH%"],
  sedan: ["%SEDAN%"],
  suv: ["%SUV%", "% CROSS%", "%CROSS %", "%CROSSOVER%"],
  picape: ["%PICAPE%", "%PICKUP%", "%PICK-UP%", "%PICK UP%"],
  utilitario: ["%UTILITARIO%", "%UTILITÁRIO%"],
  van: ["%VAN%", "%MPV%", "%MINIVAN%"],
  conversivel: ["%CONVERSIVEL%", "%CONVERSÍVEL%", "%CABRIO%"],
};

/** Cláusula SQL (`AND (...)`) que casa título ou modelo com os tokens da família. */
export function bodyTypeClause(
  bodyType: BodyType,
  values: unknown[],
  titleCol = "f.titulo_normalizado",
  modelCol = "f.modelo",
): string {
  const patterns = PATTERNS[bodyType];
  const parts: string[] = [];
  for (const pattern of patterns) {
    values.push(pattern);
    const p = `$${values.length}`;
    parts.push(`${titleCol} ILIKE ${p} OR ${modelCol} ILIKE ${p}`);
  }
  return `AND (${parts.join(" OR ")})`;
}

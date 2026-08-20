/**
 * Marca do anúncio (coletor: CHEVROLET) ↔ nome na tabela FIPE
 * (oficial: "GM - Chevrolet"). Sem isso o match falha por igualdade exata.
 */

function fold(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** Canônico → grafias que aparecem no Shopcar, no coletor e na FIPE Parallelum. */
const GROUPS: [string, readonly string[]][] = [
  ["CHEVROLET", ["CHEVROLET", "GM", "GM CHEVROLET"]],
  ["VOLKSWAGEN", ["VOLKSWAGEN", "VW", "VW VOLKSWAGEN"]],
  ["MERCEDES-BENZ", ["MERCEDES", "MERCEDES BENZ"]],
  ["CITROEN", ["CITROEN"]],
  ["CAOA CHERY", ["CHERY", "CAOA CHERY", "CAOACHERY"]],
  ["LAND ROVER", ["LAND ROVER", "LANDROVER"]],
  ["KIA", ["KIA", "KIA MOTORS"]],
  ["BMW", ["BMW"]],
  ["RAM", ["RAM"]],
  ["TOYOTA", ["TOYOTA"]],
  ["HONDA", ["HONDA"]],
  ["HYUNDAI", ["HYUNDAI"]],
  ["FIAT", ["FIAT"]],
  ["FORD", ["FORD"]],
  ["RENAULT", ["RENAULT"]],
  ["NISSAN", ["NISSAN"]],
  ["JEEP", ["JEEP"]],
  ["PEUGEOT", ["PEUGEOT"]],
  ["MITSUBISHI", ["MITSUBISHI"]],
  ["AUDI", ["AUDI"]],
  ["VOLVO", ["VOLVO"]],
  ["BYD", ["BYD"]],
  ["GWM", ["GWM"]],
];

export function canonicalBrand(name: string): string {
  const f = fold(name);
  if (!f) return "";
  for (const [canon, aliases] of GROUPS) {
    const foldedCanon = fold(canon);
    if (f === foldedCanon || aliases.some((a) => fold(a) === f)) return canon;
  }
  return f;
}

export function brandsCompatible(a: string, b: string): boolean {
  const ca = canonicalBrand(a);
  const cb = canonicalBrand(b);
  return ca !== "" && ca === cb;
}

/** Grafias para `WHERE upper(nome) = ANY(...)`. */
export function brandQueryNames(name: string): string[] {
  const canon = canonicalBrand(name);
  const group = GROUPS.find(([c]) => c === canon);
  const raw = group ? [group[0], ...group[1]] : [name];
  return [...new Set(raw.map((n) => fold(n)))];
}

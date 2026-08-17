/**
 * Match FIPE (SPEC seção 8): marca por dicionário → modelo por trigram →
 * versão por tokens → filtro por ano/combustível → confiança 0–1.
 *
 * A marca já chega resolvida do coletor (normalize.py roda antes do
 * insert); aqui o candidato é filtrado por marca exata e ranqueado por
 * similaridade textual entre o título normalizado e "modelo + versão" de
 * cada linha da tabela FIPE. `pg_trgm` faz esse pré-filtro no banco em
 * produção (índice GIN em fipe_modelos/fipe_anos); a função aqui é pura,
 * determinística e independente de índice — recebe a lista de candidatos
 * já filtrada por marca (poucas dezenas) e pontua.
 */

export interface FipeCandidate {
  fipeCode: string;
  brand: string;
  model: string;
  trim: string | null;
  modelYear: number;
  fuelType: string;
}

export interface FipeMatchInput {
  brand: string | null;
  normalizedTitle: string;
  modelYear: number | null;
  fuelType: string | null;
}

export interface FipeMatchResult {
  candidate: FipeCandidate;
  confidence: number; // 0-1
}

const AUTO_THRESHOLD = 0.85;
const REVIEW_THRESHOLD = 0.6;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter((t) => t.length > 0),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function scoreCandidate(input: FipeMatchInput, candidate: FipeCandidate): number {
  const titleTokens = tokenize(input.normalizedTitle);
  const modelTokens = tokenize(candidate.model);
  const trimTokens = tokenize(candidate.trim ?? "");

  // Modelo é sinal forte e binário: ou o título contém o nome do modelo,
  // ou não — "COROLLA" presente já credencia o candidato mesmo sem a
  // versão (GLI/XEI/Altis) estar clara no título.
  const modelPresent = modelTokens.size > 0 && [...modelTokens].every((t) => titleTokens.has(t));
  let score = modelPresent ? 0.6 : 0;

  // Versão é o que desempata candidatos do mesmo modelo — peso menor,
  // proporcional a quanto do trim aparece no título.
  if (trimTokens.size > 0) {
    score += jaccard(titleTokens, trimTokens) * 0.3;
  }

  if (input.modelYear !== null) {
    score += input.modelYear === candidate.modelYear ? 0.15 : -0.15;
  }
  if (input.fuelType !== null) {
    score += input.fuelType === candidate.fuelType ? 0.05 : -0.1;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Devolve os 3 melhores candidatos ordenados por confiança. `null` como
 * primeiro elemento do array não acontece — lista vazia quando não há
 * candidato da marca (chamador decide se isso é "sem match FIPE").
 */
export function rankFipeCandidates(
  input: FipeMatchInput,
  candidates: readonly FipeCandidate[],
  limit = 3,
): FipeMatchResult[] {
  const sameBrand = input.brand
    ? candidates.filter((c) => c.brand.toUpperCase() === input.brand!.toUpperCase())
    : candidates;

  return sameBrand
    .map((candidate) => ({ candidate, confidence: scoreCandidate(input, candidate) }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

export type FipeMatchOutcome =
  | { status: "auto"; result: FipeMatchResult }
  | { status: "review"; candidates: FipeMatchResult[] }
  | { status: "none" };

/** Aplica os limiares da seção 8 (0.85 automático, 0.60–0.85 revisão). */
export function classifyFipeMatch(ranked: readonly FipeMatchResult[]): FipeMatchOutcome {
  const best = ranked[0];
  if (!best || best.confidence < REVIEW_THRESHOLD) return { status: "none" };
  if (best.confidence >= AUTO_THRESHOLD) return { status: "auto", result: best };
  return { status: "review", candidates: [...ranked] };
}

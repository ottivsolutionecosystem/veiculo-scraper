export type DemoState = "empty" | "error" | "loading" | null;

type SearchParams = Record<string, string | string[] | undefined>;

export function getDemoState(searchParams: SearchParams): DemoState {
  const raw = searchParams.demo;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "empty" || value === "error" || value === "loading") return value;
  return null;
}

/**
 * Não é chamada de rede: só um atraso artificial para o skeleton (loading.tsx)
 * ficar visível ao navegar com `?demo=loading`. Critério de aceite da Fase 1
 * exige zero chamada de rede — isso continua verdadeiro.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class DemoError extends Error {
  constructor(screen: string) {
    super(`Falha simulada ao carregar "${screen}" (?demo=error).`);
    this.name = "DemoError";
  }
}

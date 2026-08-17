export * from "./vehicles";
export * from "./sellers";
export * from "./customers";
export * from "./matches";
export * from "./requests";
export * from "./sources";
export * from "./settings";
export * from "./audit";
export * from "./webhooks";
export * from "./branches";
export * from "./fipe";

import type { Vehicle } from "@veiculo/types";
import { VEHICLES } from "./vehicles";

/**
 * Fila do dia: veículos ativos e ainda não descartados/perdidos, ordenados
 * por score desc — "a fila é a tela principal" (SPEC seção 2).
 */
export function queueVehicles(): Vehicle[] {
  return VEHICLES.filter(
    (v) => v.listings.some((l) => l.active) && v.state !== "discarded" && v.state !== "lost",
  ).sort((a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0));
}

export function discardedVehicles(): Vehicle[] {
  return VEHICLES.filter((v) => v.state === "discarded");
}

/**
 * Paginação por cursor sobre o array em memória (CLAUDE.md: `OFFSET` é
 * proibido). O cursor é o id do último item da página anterior — mesma
 * forma que a API real (Fase 3) vai expor sobre keyset no Postgres.
 */
export function paginateByCursor<T extends { id: number | string }>(
  items: T[],
  cursor: string | null,
  limit: number,
): { items: T[]; nextCursor: string | null } {
  const startIndex = cursor ? items.findIndex((item) => String(item.id) === cursor) + 1 : 0;
  const page = items.slice(startIndex, startIndex + limit);
  const last = page[page.length - 1];
  const nextCursor = page.length === limit && last ? String(last.id) : null;
  return { items: page, nextCursor };
}

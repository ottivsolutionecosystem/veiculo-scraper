/** Fase visível de um pedido de coleta. Derivada de execucoes_solicitadas;
 * a UI não inventa estado — só traduz o que o GET /api/sources já lê. */

export const COLLECTOR_STALE_MS = 90_000;

export type ScrapePhase = "queued" | "stale" | "started" | "running";

function toMs(value: Date | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

/** `queued` = pedido fresco, coletor ainda não pegou (loop é 15s).
 * `stale` = passou do prazo e `iniciado_em` continua nulo — serviço work/collector parado.
 * `started` = coletor pegou, ainda sem `progresso` (enumeração da listagem).
 * `running` = tem contadores. */
export function scrapePhase(input: {
  requestedAt: Date | string | null | undefined;
  startedAt: Date | string | null | undefined;
  hasProgress: boolean;
  now?: number;
}): ScrapePhase {
  if (input.startedAt && input.hasProgress) return "running";
  if (input.startedAt) return "started";
  const requested = toMs(input.requestedAt);
  const now = input.now ?? Date.now();
  if (requested !== null && now - requested >= COLLECTOR_STALE_MS) return "stale";
  return "queued";
}

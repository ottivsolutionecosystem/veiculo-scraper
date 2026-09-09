import type { AcquisitionRequestState } from "@veiculo/types";

const PRE_SCHEDULE: AcquisitionRequestState[] = ["requested", "accepted"];

const LEGACY_SCHEDULED: AcquisitionRequestState[] = [
  "vehicle_at_branch",
  "under_evaluation",
  "offer_made",
];

export const KANBAN_COLUMNS: AcquisitionRequestState[] = [
  "requested",
  "scheduled",
  "closed",
];

/** Coluna visível: Aceito cai em Proposta; estágios antigos da loja em Agendado. */
export function boardColumn(state: AcquisitionRequestState): AcquisitionRequestState {
  if (state === "accepted") return "requested";
  if (LEGACY_SCHEDULED.includes(state)) return "scheduled";
  return state;
}

export function tratativaDeadlineIso(
  state: AcquisitionRequestState,
  lockedUntil: string | null | undefined,
  visitAt: string | null | undefined,
): string | null {
  if (PRE_SCHEDULE.includes(state)) return lockedUntil ?? null;
  if (boardColumn(state) === "scheduled") return visitAt ?? null;
  return null;
}

export function isTratativaOverdue(
  state: AcquisitionRequestState,
  lockedUntil: string | null | undefined,
  visitAt: string | null | undefined,
  now = Date.now(),
): boolean {
  const iso = tratativaDeadlineIso(state, lockedUntil, visitAt);
  return Boolean(iso && new Date(iso).getTime() <= now);
}

export function stageNeedsVisit(
  state: AcquisitionRequestState,
  visitAt: string | null | undefined,
): boolean {
  return state === "scheduled" && !visitAt;
}

export function showsVisitField(
  state: AcquisitionRequestState,
  pendingState?: AcquisitionRequestState | null,
): boolean {
  return boardColumn(state) === "scheduled" || pendingState === "scheduled";
}

export type MoveBlockReason = "overdue" | "needs_visit";

export function moveBlockReason(
  current: AcquisitionRequestState,
  next: AcquisitionRequestState,
  lockedUntil: string | null | undefined,
  visitAt: string | null | undefined,
): MoveBlockReason | null {
  if (current === "closed" || current === next || boardColumn(current) === next) return null;
  if (isTratativaOverdue(current, lockedUntil, visitAt)) return "overdue";
  if (next === "closed") return null;
  if (stageNeedsVisit(next, visitAt)) return "needs_visit";
  return null;
}

export function requestMatchesQuery(
  request: {
    owner: string;
    state: AcquisitionRequestState;
    vehicleId: number;
    vehicle?: { brand: string | null; model: string | null; modelYear: number | null } | undefined;
  },
  query: string,
  stateLabel: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  // "#42" procura só pelo número do veículo; sem "#" é busca livre no texto.
  if (q.startsWith("#")) {
    const digits = q.slice(1).trim();
    return digits ? String(request.vehicleId).includes(digits) : true;
  }
  return [
    request.vehicleId,
    request.vehicle?.brand,
    request.vehicle?.model,
    request.vehicle?.modelYear,
    request.owner,
    stateLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}

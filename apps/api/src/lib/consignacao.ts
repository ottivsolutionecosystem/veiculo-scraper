/**
 * Regras da consignação: um dono por carro, 2h até Agendado,
 * visita na loja a partir daí, parecer no vencimento.
 */
export const LOCK_HOURS = 2;

export const OPEN_DEAL_STATES_SQL = "('closed', 'declined', 'no_show')";

export const PRE_SCHEDULE_STATES = ["requested", "accepted"] as const;
export const PIPELINE_STATES = [
  "requested",
  "accepted",
  "scheduled",
  "vehicle_at_branch",
  "under_evaluation",
  "offer_made",
] as const;

export const RETURN_REASONS = [
  "Sem interesse em consignar",
  "Quer vender à vista",
  "Preço irreal",
  "Não compareceu",
  "Anúncio ou contato inválido",
  "Já vendeu",
] as const;

export const CONSIGNMENT_OUTCOMES = [
  "no_answer",
  "not_interested",
  "thinking",
  "negotiating",
  "accepted_consign",
  "wants_cash",
  "unrealistic_price",
  "wrong_number",
] as const;

export type ConsignmentOutcome = (typeof CONSIGNMENT_OUTCOMES)[number];

/** `agreed_to_bring` ficou no banco antigo; trata como aceitou consignar. */
export function normalizeOutcome(outcome: string): string {
  return outcome === "agreed_to_bring" ? "accepted_consign" : outcome;
}

export interface CallEffect {
  state: "new" | "analyzing" | "interested" | "contacted" | "negotiating" | "requested" | "acquired" | "lost" | "discarded";
  discardReason: string | null;
  followUpDays: number | null;
}

/** Ligação legado: consignou vira estoque; o resto volta à fila com a tag. */
export function effectOfOutcome(outcome: string): CallEffect {
  switch (normalizeOutcome(outcome)) {
    case "accepted_consign":
      return { state: "acquired", discardReason: null, followUpDays: null };
    case "negotiating":
      return { state: "negotiating", discardReason: null, followUpDays: 2 };
    case "thinking":
      return { state: "contacted", discardReason: null, followUpDays: 2 };
    case "no_answer":
      return { state: "contacted", discardReason: null, followUpDays: 1 };
    case "not_interested":
      return { state: "contacted", discardReason: "Sem interesse em consignar", followUpDays: null };
    case "wants_cash":
      return { state: "contacted", discardReason: "Quer vender à vista", followUpDays: null };
    case "unrealistic_price":
      return { state: "contacted", discardReason: "Preço irreal", followUpDays: null };
    case "wrong_number":
      return { state: "contacted", discardReason: "Anúncio ou contato inválido", followUpDays: null };
    default:
      return { state: "contacted", discardReason: null, followUpDays: 2 };
  }
}

export interface ParecerEffect {
  requestState: "closed" | "declined";
  vehicleState: "acquired" | "contacted";
  discardReason: string | null;
  clearOwner: boolean;
}

export function effectOfParecer(consigned: boolean, reason?: string | null): ParecerEffect {
  if (consigned) {
    return {
      requestState: "closed",
      vehicleState: "acquired",
      discardReason: null,
      clearOwner: false,
    };
  }
  const tag = reason?.trim() ?? "";
  if (!tag) {
    throw new Error("Informe o motivo para devolver o carro à fila.");
  }
  return {
    requestState: "declined",
    vehicleState: "contacted",
    discardReason: tag,
    clearOwner: true,
  };
}

export interface WorkLock {
  operatorId: number | null;
  lockedUntil: Date | null;
  lastContactedAt: Date | null;
  /** Solicitação aberta no kanban: o dono segura até o parecer. */
  openDeal?: boolean;
}

/** Livre, trava vencida sem tratativa, ou o próprio dono. */
export function canClaim(now: Date, lock: WorkLock, claimantId: number): boolean {
  if (!Number.isInteger(claimantId) || claimantId <= 0) return false;
  if (lock.operatorId === claimantId) return true;
  if (lock.openDeal && lock.operatorId && lock.operatorId !== claimantId) return false;
  if (lock.lockedUntil && lock.lockedUntil > now && lock.operatorId && lock.operatorId !== claimantId) {
    return false;
  }
  return true;
}

/** Só o dono atual passa o carro. O master (supervise) reatribui qualquer um. */
export function canTransfer(
  ownerId: number | null,
  fromId: number,
  toId: number,
  supervise = false,
): boolean {
  if (!Number.isInteger(toId) || toId <= 0) return false;
  if (ownerId === toId) return false;
  if (supervise && ownerId != null) return true;
  if (!Number.isInteger(fromId) || fromId <= 0 || fromId === toId) return false;
  return ownerId === fromId;
}

/** Quem pode consignar, gravar parecer ou descartar. Master vê e age em todos. */
export function canWork(
  now: Date,
  lock: WorkLock,
  actorId: number,
  supervise = false,
): boolean {
  if (supervise) return true;
  return canClaim(now, lock, actorId);
}

export function lockUntil(now: Date, hours = LOCK_HOURS): Date {
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

export function followUpAt(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isPreSchedule(state: string): boolean {
  return (PRE_SCHEDULE_STATES as readonly string[]).includes(state);
}

export function isPipelineState(state: string): boolean {
  return (PIPELINE_STATES as readonly string[]).includes(state);
}

/** Até Agendado vale a trava de 2h; depois vale a visita à loja. */
export function tratativaDeadline(
  state: string,
  lockedUntil: Date | null,
  visitAt: Date | null,
): Date | null {
  if (isPreSchedule(state)) return lockedUntil;
  if (isPipelineState(state)) return visitAt;
  return null;
}

export function isTratativaOverdue(
  now: Date,
  state: string,
  lockedUntil: Date | null,
  visitAt: Date | null,
): boolean {
  const deadline = tratativaDeadline(state, lockedUntil, visitAt);
  return deadline !== null && deadline.getTime() <= now.getTime();
}

export function needsVisitAt(nextState: string, visitAt: Date | null): boolean {
  return nextState === "scheduled" && visitAt === null;
}

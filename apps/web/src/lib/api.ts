import type {
  AuditRecord,
  Operator,
  OpsOverview,
  OpsRange,
  Settings,
  StartCallResponse,
  TelephonySession,
  Webhook,
} from "@veiculo/types";
import { API_URL } from "./env";
import { getStoredToken } from "./session";
import type {
  Page,
  QueueItem,
  VehicleDetailResponse,
  RequestListItem,
  BranchWithLoad,
  SellerListItem,
  SellerDetailResponse,
  FipeReviewItem,
  SourceWithLastRun,
  SettingsResponse,
  ScrapeRequest,
} from "./api-types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

// ---- Fila do dia / Busca -----------------------------------------------

export type QueueScope = "untouched" | "mine" | "followup" | "price_drop" | "all" | "tagged";

export interface QueueStats {
  online: number;
  untouched: number;
  mine: number;
  followup: number;
  priceDrop: number;
  tagged: number;
  ranking: { operator: string; contactedToday: number; negotiating: number; inPipeline: number }[];
}

export function getQueue(
  params: {
    cursor?: string;
    limit?: number;
    sellerType?: "individual" | "dealer";
    scope?: QueueScope;
    q?: string;
    brand?: string;
    priceMaxCents?: number;
    scoreBand?: "quente" | "boa" | "morna" | "fria";
    source?: string;
  } = {},
) {
  return apiFetch<Page<QueueItem>>(`/api/queue${qs(params)}`);
}

export function getQueueStats(params: { sellerType?: "individual" | "dealer" } = {}) {
  return apiFetch<QueueStats>(`/api/queue/stats${qs(params)}`);
}

export function claimVehicle(id: number) {
  return apiFetch<{ vehicleId: number; requestId: number }>(`/api/vehicles/${id}/claim`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function transferVehicle(id: number, toOperatorId: number) {
  return apiFetch<void>(`/api/vehicles/${id}/transfer`, {
    method: "POST",
    body: JSON.stringify({ toOperatorId }),
  });
}

export function searchVehicles(
  params: {
    cursor?: string;
    limit?: number;
    vehicleId?: number;
    brand?: string;
    model?: string;
    city?: string;
    yearMin?: number;
    yearMax?: number;
    priceMaxCents?: number;
    minFipeDiscountPct?: number;
    transmission?: string;
    includeInactive?: boolean;
    priceChanged?: boolean;
    sellerType?: "individual" | "dealer";
  } = {},
) {
  return apiFetch<Page<QueueItem>>(`/api/vehicles/search${qs(params)}`);
}

// ---- Ficha do veículo ----------------------------------------------------

export function getVehicle(id: number) {
  return apiFetch<VehicleDetailResponse>(`/api/vehicles/${id}`);
}

export function discardVehicle(id: number, reason: string, notes?: string) {
  return apiFetch<void>(`/api/vehicles/${id}/discard`, {
    method: "POST",
    body: JSON.stringify({ reason, notes }),
  });
}

export function postInteraction(
  id: number,
  body: { channel: "phone" | "whatsapp"; outcome?: string; durationSeconds?: number; operator?: string },
) {
  return apiFetch<void>(`/api/vehicles/${id}/interactions`, { method: "POST", body: JSON.stringify(body) });
}

export function confirmFipeMatch(id: number, fipeCode: string) {
  return apiFetch<void>(`/api/vehicles/${id}/fipe-match/confirm`, {
    method: "POST",
    body: JSON.stringify({ fipeCode }),
  });
}

export function revealSellerContact(sellerId: number) {
  return apiFetch<{ phone: string }>(`/api/sellers/${sellerId}/reveal-contact`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getTelephonySession() {
  return apiFetch<TelephonySession>("/api/telephony/session");
}

export function startVehicleCall(vehicleId: number) {
  return apiFetch<StartCallResponse>(`/api/vehicles/${vehicleId}/calls/start`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function linkCallExternal(interactionId: number, externalId: string) {
  return apiFetch<void>(`/api/interactions/${interactionId}/external`, {
    method: "POST",
    body: JSON.stringify({ externalId }),
  });
}

export async function fetchCallRecording(interactionId: number): Promise<Blob> {
  const headers = new Headers();
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_URL}/api/interactions/${interactionId}/recording`, {
    cache: "no-store",
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? `Erro ${res.status}`);
  }
  return res.blob();
}

// ---- Discador ------------------------------------------------------------

export function getDialerQueue(params: { cursor?: string; limit?: number } = {}) {
  return apiFetch<Page<QueueItem>>(`/api/dialer/queue${qs(params)}`);
}

export function postCall(
  id: number,
  body: {
    outcome: string;
    durationSeconds?: number;
    operator?: string;
    interactionId?: number;
    channel?: "phone" | "whatsapp";
    externalId?: string;
  },
) {
  return apiFetch<void>(`/api/vehicles/${id}/calls`, { method: "POST", body: JSON.stringify(body) });
}

// ---- Solicitações ----------------------------------------------------

export function getRequests(params: {
  cursor?: string;
  limit?: number;
  state?: string;
  branchId?: number;
  open?: boolean;
} = {}) {
  return apiFetch<Page<RequestListItem>>(`/api/requests${qs(params)}`);
}

export function createRequest(body: {
  vehicleId: number;
  branchId: number;
  customerId?: number;
  proposedAt?: string;
}) {
  return apiFetch<RequestListItem>("/api/requests", { method: "POST", body: JSON.stringify(body) });
}

export function patchRequest(
  id: number,
  body: Partial<{
    state: string;
    checklist: Record<string, boolean>;
    lossReason: string;
    notes: string;
    proposedAt: string;
  }>,
) {
  return apiFetch<RequestListItem>(`/api/requests/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function postParecer(id: number, body: { consigned: boolean; reason?: string }) {
  return apiFetch<RequestListItem>(`/api/requests/${id}/parecer`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getBranches() {
  return apiFetch<BranchWithLoad[]>("/api/branches");
}

// ---- Vendedores --------------------------------------------------------

export function getSellers(params: { cursor?: string; limit?: number } = {}) {
  return apiFetch<Page<SellerListItem>>(`/api/sellers${qs(params)}`);
}

export function getSeller(id: number) {
  return apiFetch<SellerDetailResponse>(`/api/sellers/${id}`);
}

export function patchSeller(id: number, body: { muted?: boolean; doNotDisturb?: boolean }) {
  return apiFetch<SellerListItem>(`/api/sellers/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

// ---- Revisão de match FIPE ---------------------------------------------

export function getFipeReview(params: { cursor?: string; limit?: number } = {}) {
  return apiFetch<Page<FipeReviewItem>>(`/api/fipe-review${qs(params)}`);
}

// ---- Fontes --------------------------------------------------------------

export function getSources() {
  return apiFetch<SourceWithLastRun[]>("/api/sources");
}

export function patchSource(source: string, active: boolean) {
  return apiFetch<SourceWithLastRun>(`/api/sources/${source}`, { method: "PATCH", body: JSON.stringify({ active }) });
}

/** Botão "Rodar coleta agora" — só grava o pedido (202); quem processa é o
 * coletor Python lendo execucoes_solicitadas (sem RPC, SPEC seção 5). */
export function triggerScrapeRun(source: string, body: { sellerType?: "individual" | "dealer"; limit?: number }) {
  return apiFetch<ScrapeRequest>(`/api/sources/${source}/run`, { method: "POST", body: JSON.stringify(body) });
}

// ---- Ajustes ---------------------------------------------------------

export function getSettings() {
  return apiFetch<SettingsResponse | null>("/api/settings");
}

export function putSettings(body: Settings & { author: string }) {
  return apiFetch<SettingsResponse>("/api/settings", { method: "PUT", body: JSON.stringify(body) });
}

export function getWebhooks() {
  return apiFetch<Webhook[]>("/api/webhooks");
}

// ---- Auditoria -------------------------------------------------------

export function getAudit(
  params: { cursor?: string; limit?: number; action?: string; author?: string; targetType?: string } = {},
) {
  return apiFetch<Page<AuditRecord>>(`/api/audit${qs(params)}`);
}

// ---- Operação (master) -------------------------------------------------

export function getOpsOverview(
  params: {
    range?: OpsRange;
    from?: string;
    to?: string;
    operatorId?: number;
    sellerType?: "individual" | "dealer";
  } = {},
) {
  return apiFetch<OpsOverview>(`/api/ops/overview${qs(params)}`);
}

// ---- Identidade / equipe -----------------------------------------------

export function getAuthStatus() {
  return apiFetch<{ needsSetup: boolean; masterLogin: string }>("/api/auth/status");
}

export function getMe() {
  return apiFetch<{ operator: Operator }>("/api/auth/me");
}

export function login(body: { login: string; password: string }) {
  return apiFetch<{ token: string; operator: Operator }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function setupFirstOperator(body: { name: string; login: string; password: string }) {
  return apiFetch<{ token: string; operator: Operator }>("/api/auth/setup", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function logout() {
  return apiFetch<void>("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
}

export function getOperators() {
  return apiFetch<{ items: Operator[] }>("/api/operators");
}

export function createOperator(body: { name: string; login: string; password: string }) {
  return apiFetch<Operator>("/api/operators", { method: "POST", body: JSON.stringify(body) });
}

export function patchOperator(id: number, body: { active: boolean }) {
  return apiFetch<Operator>(`/api/operators/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

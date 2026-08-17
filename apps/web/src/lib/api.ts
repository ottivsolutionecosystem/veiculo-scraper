import type {
  AuditRecord,
  Customer,
  Interest,
  Settings,
  Webhook,
} from "@veiculo/types";
import { API_URL } from "./env";
import type {
  Page,
  QueueItem,
  VehicleDetailResponse,
  CustomerListItem,
  CustomerDetailResponse,
  RequestListItem,
  BranchWithLoad,
  SellerListItem,
  SellerDetailResponse,
  FipeReviewItem,
  SourceWithLastRun,
  SettingsResponse,
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
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
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

export function getQueue(params: { cursor?: string; limit?: number } = {}) {
  return apiFetch<Page<QueueItem>>(`/api/queue${qs(params)}`);
}

export function searchVehicles(
  params: {
    cursor?: string;
    limit?: number;
    brand?: string;
    model?: string;
    city?: string;
    yearMin?: number;
    yearMax?: number;
    priceMaxCents?: number;
    minFipeDiscountPct?: number;
    transmission?: string;
    onlyActive?: boolean;
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

export function postInteraction(id: number, body: { channel: "phone" | "whatsapp"; outcome?: string; durationSeconds?: number }) {
  return apiFetch<void>(`/api/vehicles/${id}/interactions`, { method: "POST", body: JSON.stringify(body) });
}

export function confirmFipeMatch(id: number, fipeCode: string) {
  return apiFetch<void>(`/api/vehicles/${id}/fipe-match/confirm`, {
    method: "POST",
    body: JSON.stringify({ fipeCode }),
  });
}

export function revealSellerContact(id: number) {
  return apiFetch<{ phone: string }>(`/api/sellers/${id}/reveal-contact`, { method: "POST" });
}

// ---- Discador ------------------------------------------------------------

export function getDialerQueue(params: { cursor?: string; limit?: number } = {}) {
  return apiFetch<Page<QueueItem>>(`/api/dialer/queue${qs(params)}`);
}

export function postCall(id: number, body: { outcome: string; durationSeconds?: number }) {
  return apiFetch<void>(`/api/vehicles/${id}/calls`, { method: "POST", body: JSON.stringify(body) });
}

// ---- Clientes e interesses -------------------------------------------

export function getCustomers(params: { cursor?: string; limit?: number } = {}) {
  return apiFetch<Page<CustomerListItem>>(`/api/customers${qs(params)}`);
}

export function getCustomer(id: number) {
  return apiFetch<CustomerDetailResponse>(`/api/customers/${id}`);
}

export function createCustomer(body: Omit<Customer, "id" | "createdAt">) {
  return apiFetch<Customer>("/api/customers", { method: "POST", body: JSON.stringify(body) });
}

export function createInterest(customerId: number, body: Omit<Interest, "id" | "customerId">) {
  return apiFetch<Interest>(`/api/customers/${customerId}/interests`, { method: "POST", body: JSON.stringify(body) });
}

// ---- Solicitações ----------------------------------------------------

export function getRequests(params: { cursor?: string; limit?: number; state?: string; branchId?: number } = {}) {
  return apiFetch<Page<RequestListItem>>(`/api/requests${qs(params)}`);
}

export function createRequest(body: { vehicleId: number; branchId: number; customerId?: number; proposedAt: string }) {
  return apiFetch<RequestListItem>("/api/requests", { method: "POST", body: JSON.stringify(body) });
}

export function patchRequest(
  id: number,
  body: Partial<{ state: string; checklist: Record<string, boolean>; lossReason: string; notes: string }>,
) {
  return apiFetch<RequestListItem>(`/api/requests/${id}`, { method: "PATCH", body: JSON.stringify(body) });
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

import type {
  Score,
  Listing,
  Vehicle,
  Seller,
  Customer,
  Interest,
  InterestMatch,
  AcquisitionRequest,
  Branch,
  Source,
  ScrapeRun,
  Settings,
  AuditRecord,
  Webhook,
} from "@veiculo/types";

/** Item de lista de /api/queue e /api/vehicles/search — Pick<Vehicle, ...>
 * achatado com o anúncio principal (docs/API.md seções 1 e 2). Não é o
 * `Vehicle` completo — a ficha (/api/vehicles/:id) devolve esse, sim. */
export interface QueueItem {
  id: number;
  state: Vehicle["state"];
  discardReason: string | null;
  sellerId: number | null;
  sellerName: string | null;
  sellerMaskedPhone: string | null;
  fipeDiscountPct: number | null;
  fipeDiscountCents: number | null;
  fipeMatchConfidence: number | null;
  daysListed: number;
  compatibleCustomersCount: number;
  listingsCount: number;
  score: Score | null;
  listing: Pick<
    Listing,
    | "id"
    | "source"
    | "normalizedTitle"
    | "brand"
    | "model"
    | "trim"
    | "manufactureYear"
    | "modelYear"
    | "km"
    | "priceCents"
    | "transmission"
    | "fuelType"
    | "color"
    | "city"
    | "stateCode"
    | "photos"
    | "sellerType"
    | "active"
    | "pendingFields"
  >;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface VehicleDetailResponse {
  vehicle: Vehicle;
  seller: (Seller & { maskedPhone: string | null }) | null;
  otherVehicles: { vehicleId: number; listing: Partial<Listing> }[];
  matches: (InterestMatch & { customer: { id: number; name: string } })[];
}

export interface CustomerListItem extends Customer {
  totalInterests: number;
  totalMatches: number;
}

export interface InterestWithMatches extends Interest {
  matches: (InterestMatch & { vehicle: { brand: string | null; model: string | null; modelYear: number | null; priceCents: number | null } })[];
}

export interface CustomerDetailResponse {
  customer: Customer;
  interests: InterestWithMatches[];
}

export interface RequestListItem extends AcquisitionRequest {
  vehicle?: { brand: string | null; model: string | null; modelYear: number | null; priceCents: number | null };
  branchName?: string;
}

export interface BranchWithLoad extends Branch {
  requestsThisPeriod: number;
}

export interface SellerListItem extends Seller {
  totalListings: number;
}

export interface SellerDetailResponse {
  seller: Seller;
  vehicles: { vehicleId: number; listing: Partial<Listing> }[];
}

export interface FipeReviewItem {
  id: number;
  fipeMatchConfidence: number | null;
  fipeMatchCandidates: Vehicle["fipeMatchCandidates"];
  brand: string | null;
  model: string | null;
  trim: string | null;
  modelYear: number | null;
  priceCents: number | null;
  normalizedTitle: string;
}

/** Linha de execucoes_solicitadas (docs/MODELO.md — Fase 4): botão
 * "Rodar coleta agora" só grava isso, quem processa é o coletor Python. */
export interface ScrapeRequest {
  id: number;
  source: string;
  sellerType: "individual" | "dealer" | null;
  limit: number | null;
  requestedBy: string;
  requestedAt: string;
  processedAt: string | null;
  scrapeRunId: number | null;
}

export interface SourceWithLastRun extends Source {
  lastRun: ScrapeRun | null;
  pendingRequest: ScrapeRequest | null;
}

export interface SettingsResponse extends Settings {
  version: number;
}

export type { AuditRecord, Webhook };

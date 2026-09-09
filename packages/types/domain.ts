/**
 * Tipos de domínio — fonte da verdade para apps/web, apps/api e mocks
 * (CLAUDE.md). Identificadores em inglês por convenção de código; textos
 * de interface (rótulos, mensagens) ficam fora daqui, na camada de UI.
 *
 * Reconciliação de campos:
 * - `Listing` espelha a tabela `anuncios` de db/schema.sql e o dataclass
 *   `VeiculoNormalizado` de services/collector/captacao_bot/models.py.
 *   Os dois já usam os mesmos nomes de campo (fonte, id_externo, titulo_*,
 *   ano_fabricacao, ano_modelo, cambio, combustivel, uf, fotos,
 *   content_hash, fingerprint) — o coletor já nasceu alinhado ao schema.
 *   `Vehicle` (tabela `veiculos`, ainda não criada) é o registro canônico
 *   pós-dedupe agregando um ou mais `Listing`.
 * - `preceCents` (e todo campo `*Cents`) é `bigint` em centavos no banco
 *   (coluna `preco`), igual ao `preco: int | None` do Python.
 */

// ---------------------------------------------------------------------------
// Coleta (db/schema.sql: fontes, anuncios, preco_historico, scrape_runs)
// ---------------------------------------------------------------------------

export type AccessLevel = "official_feed" | "authorized" | "public_polite" | "manual";

export interface Source {
  source: string; // PK = fonte.fonte
  accessLevel: AccessLevel;
  legalBasis: string; // fontes.base_legal
  active: boolean; // fontes.ativa
  cursor: string | null;
  pausedUntil: string | null; // ISO datetime
  disabled: boolean;
  reason: string | null;
}

export type Transmission = "MANUAL" | "AUTOMATICO" | "AUTOMATIZADO";
export type FuelType =
  | "FLEX"
  | "GASOLINA"
  | "ALCOOL"
  | "DIESEL"
  | "GNV"
  | "HIBRIDO"
  | "ELETRICO";

export interface Listing {
  id: number;
  source: string; // fonte
  externalId: string; // id_externo
  url: string;

  originalTitle: string; // titulo_original
  normalizedTitle: string; // titulo_normalizado
  brand: string | null; // marca
  model: string | null; // modelo
  trim: string | null; // versao
  manufactureYear: number | null; // ano_fabricacao
  modelYear: number | null; // ano_modelo
  km: number | null;
  priceCents: number | null; // preco
  transmission: Transmission | null; // cambio
  fuelType: FuelType | null; // combustivel
  color: string | null; // cor
  city: string | null; // cidade
  stateCode: string | null; // uf
  photos: string[]; // fotos
  sellerType: "individual" | "dealer" | null; // tipo_anunciante — null = não detectado

  fingerprint: string;
  contentHash: string; // content_hash
  pendingFields: string[]; // pendencias — campos que a normalização não extraiu

  firstSeenAt: string; // primeira_vista_em
  lastSeenAt: string; // ultima_vista_em
  active: boolean; // ativo
  deactivatedAt: string | null; // desativado_em — quando saiu do ar. Nunca deletamos.
}

export interface PriceHistoryPoint {
  id: number;
  listingId: number;
  priceCents: number;
  observedAt: string;
}

export interface ScrapeRun {
  id: number;
  source: string;
  startedAt: string;
  finishedAt: string;
  requests: number;
  notModified: number;
  new: number;
  updated: number;
  unchanged: number;
  needsReview: number;
  errors: number;
  endedBy: string; // "fim" | "limite" | "circuito aberto" | "robots.txt" | ...
  sellerTypeFilter: "individual" | "dealer" | null; // tipo_anunciante_filtro
  deactivated: number; // desativados — saíram do ar nesta varredura
  priceChanges: number; // precos_alterados
  skippedByFilter: number; // ignorados_filtro — ficha contradisse a listagem
}

/** Progresso de uma coleta em andamento (`execucoes_solicitadas.progresso`).
 * O coletor grava, a tela Fontes lê. Não é RPC: a fronteira é o Postgres. */
export interface ScrapeProgress {
  onlineCount: number; // no_ar — anúncios que a listagem mostra agora
  pages: number; // paginas de listagem já lidas
  requests: number;
  new: number;
  updated: number;
  priceChanges: number;
  unchanged: number;
  deactivated: number;
  errors: number;
  /** listagem = paginando a busca; fichas = abrindo anúncio. */
  stage?: "listing" | "detailing";
}

// ---------------------------------------------------------------------------
// Veículo canônico e trabalho (seção 6/7 do SPEC — a criar em Fase 3)
// ---------------------------------------------------------------------------

export type VehicleState =
  | "new"
  | "analyzing"
  | "interested"
  | "contacted"
  | "negotiating"
  | "requested"
  | "acquired"
  | "lost"
  | "discarded";

export interface ReturnTrigger {
  kind: "price_drop" | "days_elapsed";
  value: number; // ex: 7 (%) ou 30 (dias)
}

export type ScoreBand = "quente" | "boa" | "morna" | "fria";

export interface ScoreComponent {
  key:
    | "fipe_discount"
    | "days_listed"
    | "price_drops"
    | "model_liquidity"
    | "km_vs_average"
    | "completeness"
    | "internal_demand"
    | "risk";
  rawValueLabel: string; // ex: "14,2%" — já formatado para exibição
  points: number; // pode ser negativo (risco)
}

export interface Score {
  vehicleId: number;
  total: number; // 0-100
  band: ScoreBand;
  components: ScoreComponent[];
  calculatedAt: string;
}

export interface Vehicle {
  id: number;
  fingerprint: string;
  listings: Listing[]; // anuncio_veiculo (N:N)
  primaryListingId: number;
  state: VehicleState;
  discardReason: string | null;
  returnTrigger: ReturnTrigger | null;
  fipeDiscountPct: number | null; // desconto_fipe_pct
  fipeDiscountCents: number | null; // desconto_fipe_reais
  fipeAdjustedCents: number | null; // fipe_ajustada (curva de km, opcional)
  fipeMatchConfidence: number | null; // 0-1
  fipeMatchCandidates: FipeMatchCandidate[] | null; // preenchido quando 0.60 ≤ confiança < 0.85
  score: Score | null;
  priceHistory: PriceHistoryPoint[];
  daysListed: number;
  sellerId: number | null;
  consignador?: string | null; // nome do dono (exibição)
  consignadorId?: number | null; // identidade do dono
  lockedUntil?: string | null;
  lastContactedAt?: string | null;
  followUpAt?: string | null;
  compatibleCustomersCount: number; // etiqueta "N clientes procurando"
}

// ---------------------------------------------------------------------------
// FIPE
// ---------------------------------------------------------------------------

export interface FipeBrand {
  code: string;
  name: string;
}

export interface FipeModel {
  code: string;
  brandCode: string;
  name: string;
}

export interface FipePrice {
  fipeCode: string;
  brand: string;
  model: string;
  modelYear: number;
  fuelType: FuelType;
  referenceMonth: string; // "2026-07"
  valueCents: number;
}

/** Candidato da fila de revisão de match FIPE (seção 8 do SPEC): confiança
 * entre 0.60 e 0.85 mostra até 3 candidatos para confirmação manual. */
export interface FipeMatchCandidate {
  fipeCode: string;
  label: string; // "COROLLA XEI 2.0 16V 2020" já formatado para exibição
  confidence: number; // 0-1
}

// ---------------------------------------------------------------------------
// Vendedor e contato (seção 4.6/12 do SPEC)
// ---------------------------------------------------------------------------

export interface Seller {
  id: number;
  name: string;
  maskedPhone: string; // "(67) 9****-1234" — telefone real nunca trafega aqui
  totalListings: number;
  muted: boolean;
  doNotDisturb: boolean;
  lastContactedAt: string | null;
}

export type CallOutcome =
  | "no_answer"
  | "not_interested"
  | "thinking"
  | "negotiating"
  | "agreed_to_bring"
  | "accepted_consign"
  | "wants_cash"
  | "unrealistic_price"
  | "wrong_number";

export interface Interaction {
  id: number;
  vehicleId: number;
  sellerId: number | null;
  channel: "phone" | "whatsapp";
  outcome: CallOutcome | null;
  durationSeconds: number | null;
  author: string;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  /** Player via API autenticada — a URL crua do fornecedor não sai. */
  recordingAvailable: boolean;
}

export type TelephonyMode = "softphone" | "tel_link";

export interface TelephonySession {
  mode: TelephonyMode;
  /** Só no modo softphone, só para operador autenticado. Nunca persistir. */
  token?: string;
}

export interface StartCallResponse {
  interactionId: number;
  mode: TelephonyMode;
  phone: string;
  channel: "phone" | "whatsapp";
}

// ---------------------------------------------------------------------------
// Clientes, interesses e casamento (seção 10 do SPEC)
// ---------------------------------------------------------------------------

export interface Customer {
  id: number;
  name: string;
  contact: string;
  source: string; // origem do lead
  owner: string; // responsável
  notes: string | null;
  createdAt: string;
}

export type InterestStatus = "active" | "paused" | "fulfilled";
export type InterestPriority = "high" | "medium" | "low";

export interface Interest {
  id: number;
  customerId: number;
  brand: string | null;
  model: string | null;
  yearMin: number | null;
  yearMax: number | null;
  maxKm: number | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  transmission: Transmission | null;
  city: string | null;
  priority: InterestPriority;
  validUntil: string | null;
  status: InterestStatus;
}

export type InterestMatchState = "suggested" | "accepted" | "discarded";

export interface InterestMatch {
  id: number;
  interestId: number;
  vehicleId: number;
  matchScore: number; // 0-100, aderência
  state: InterestMatchState;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Solicitação de veículo na loja (seção 11 do SPEC)
// ---------------------------------------------------------------------------

export type AcquisitionRequestState =
  | "requested"
  | "accepted"
  | "scheduled"
  | "vehicle_at_branch"
  | "under_evaluation"
  | "offer_made"
  | "closed"
  | "declined"
  | "no_show";

export interface IntakeChecklist {
  document: boolean;
  spareKey: boolean;
  manual: boolean;
  inspection: boolean;
  standardPhotos: boolean;
  appraisal: boolean;
}

export interface AcquisitionRequest {
  id: number;
  vehicleId: number;
  sellerId: number;
  customerId: number | null;
  branchId: number;
  owner: string; // responsável
  proposedAt: string | null; // visita à loja — obrigatória só em Agendado
  state: AcquisitionRequestState;
  lossReason: string | null;
  notes: string | null;
  checklist: IntakeChecklist;
  createdAt: string;
  lockedUntil?: string | null; // 2h até Agendado; depois, a visita
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  intakeLimitPerPeriod: number;
}

// ---------------------------------------------------------------------------
// Configuração, auditoria e webhooks (seções 9, 13 e 4.6 do SPEC)
// ---------------------------------------------------------------------------

export interface ScoreWeight {
  key: ScoreComponent["key"];
  label: string; // rótulo em português — dado, não identificador de código
  weight: number; // 0-1
}

export interface KmCurvePoint {
  modelYear: number;
  averageKm: number;
}

export interface Settings {
  weights: ScoreWeight[];
  bandThresholds: { hot: number; good: number; warm: number };
  discardReasons: string[];
  returnTriggerPricePct: number;
  returnTriggerDays: number;
  sellerCooldownHours: number;
  followUpDays: number[]; // [2, 7]
  kmCurve: KmCurvePoint[];
  whatsappTemplate: string;
  allowedHoursStart: string; // "08:00"
  allowedHoursEnd: string; // "20:00"
}

export type AuditAction =
  | "reveal_contact"
  | "discard"
  | "change_weight"
  | "mute_seller"
  | "delete_contact"
  | "claim"
  | "transfer"
  | "create_operator"
  | "authorize_operator"
  | "parecer"
  | "edit_seller_contact";

/** Consignador autenticado. O nome no card vem daqui, não de texto livre. */
export type OperatorRole = "master" | "consignador";

export interface Operator {
  id: number;
  name: string;
  login: string;
  role: OperatorRole;
  active: boolean;
}

export interface AuditRecord {
  id: number;
  action: AuditAction;
  author: string;
  targetType: string;
  targetId: string;
  detail: string;
  createdAt: string;
}

export interface Webhook {
  id: number;
  url: string;
  events: string[];
  active: boolean;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: number | null;
}

// ---------------------------------------------------------------------------
// Dashboard de operação (master) — agregados, nunca telefone
// ---------------------------------------------------------------------------

export type OpsRange = "today" | "7d" | "30d" | "month";

export interface OpsKpi {
  value: number;
  previous: number | null;
  /** count = inteiro; rate = 0–1; pct = pontos percentuais; cents = dinheiro; hours = duração. */
  unit: "count" | "rate" | "pct" | "cents" | "hours";
  formula: string;
}

export interface OpsDailyPoint {
  day: string; // YYYY-MM-DD
  consigned: number;
  returned: number;
  claims: number;
}

export interface OpsFunnelStage {
  key: string;
  label: string;
  count: number;
}

export interface OpsReasonSlice {
  reason: string;
  count: number;
}

export interface OpsOperatorRow {
  operatorId: number;
  name: string;
  login: string;
  active: boolean;
  claims: number;
  consigned: number;
  returned: number;
  conversion: number | null;
  closeRate: number | null;
  open: number;
  overdue: number;
  avgHoursToParecer: number | null;
  visits: number;
}

export interface OpsDealRow {
  requestId: number;
  vehicleId: number;
  title: string;
  owner: string;
  ownerId: number | null;
  state: string;
  deadline: string | null;
  visitAt: string | null;
}

export interface OpsCollection {
  lastRunAt: string | null;
  source: string | null;
  novos: number;
  erros: number;
  fipePending: number;
  newListingsPeriod: number;
}

export interface OpsOverview {
  from: string;
  to: string;
  range: OpsRange;
  kpis: {
    stockTotal: OpsKpi;
    consignedPeriod: OpsKpi;
    returnedPeriod: OpsKpi;
    conversion: OpsKpi;
    pipelineOpen: OpsKpi;
    overdue: OpsKpi;
    claims: OpsKpi;
    closeRate: OpsKpi;
    avgTicketCents: OpsKpi;
    avgFipeDiscountPct: OpsKpi;
    visits: OpsKpi;
    online: OpsKpi;
  };
  funnel: OpsFunnelStage[];
  daily: OpsDailyPoint[];
  ranking: OpsOperatorRow[];
  returnReasons: OpsReasonSlice[];
  kanbanNow: OpsFunnelStage[];
  stockBrands: OpsReasonSlice[];
  overdueItems: OpsDealRow[];
  upcomingVisits: OpsDealRow[];
  collection: OpsCollection;
}


import type {
  VehicleState,
  ScoreBand,
  CallOutcome,
  AcquisitionRequestState,
  InterestPriority,
  InterestStatus,
  AccessLevel,
  AuditAction,
} from "@veiculo/types";

export const VEHICLE_STATE_LABELS: Record<VehicleState, string> = {
  new: "Novo",
  analyzing: "Em análise",
  interested: "Interessado",
  contacted: "Contatado",
  negotiating: "Negociando",
  requested: "Solicitado",
  acquired: "Captado",
  lost: "Perdido",
  discarded: "Descartado",
};

export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  quente: "Quente",
  boa: "Boa",
  morna: "Morna",
  fria: "Fria",
};

export const SCORE_COMPONENT_LABELS: Record<string, string> = {
  fipe_discount: "Desconto vs FIPE",
  days_listed: "Dias no ar",
  price_drops: "Quedas de preço",
  model_liquidity: "Liquidez do modelo",
  km_vs_average: "Km vs média do ano",
  completeness: "Completude",
  internal_demand: "Demanda interna",
  risk: "Risco",
};

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  no_answer: "Não atendeu",
  not_interested: "Sem interesse",
  thinking: "Vai pensar",
  negotiating: "Negociando",
  agreed_to_bring: "Aceitou trazer",
  wrong_number: "Número errado",
};

export const REQUEST_STATE_LABELS: Record<AcquisitionRequestState, string> = {
  requested: "Solicitado",
  accepted: "Aceito",
  scheduled: "Agendado",
  vehicle_at_branch: "Veículo na loja",
  under_evaluation: "Em avaliação",
  offer_made: "Proposta feita",
  closed: "Fechado",
  declined: "Recusado",
  no_show: "Não compareceu",
};

export const INTEREST_PRIORITY_LABELS: Record<InterestPriority, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export const INTEREST_STATUS_LABELS: Record<InterestStatus, string> = {
  active: "Ativo",
  paused: "Pausado",
  fulfilled: "Atendido",
};

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  official_feed: "Feed/API oficial",
  authorized: "Acesso autorizado",
  public_polite: "Página pública, coleta educada",
  manual: "Manual",
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  reveal_contact: "Revelou contato",
  discard: "Descartou",
  change_weight: "Mudou peso",
  mute_seller: "Mutou vendedor",
  delete_contact: "Excluiu contato",
};

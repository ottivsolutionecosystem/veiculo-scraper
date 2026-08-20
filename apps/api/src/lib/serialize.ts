/**
 * Toda rota devolve o shape de packages/types/domain.ts (camelCase,
 * inglês) — nunca a linha crua do Postgres (snake_case, português). Estes
 * mapeadores são a única fronteira de tradução; nenhuma rota deve montar
 * JSON à mão a partir de `row.*` fora daqui.
 */

import { scrapePhase } from "./scrape-status.js";

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

function iso(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

const SELLER_TYPE_MAP: Record<string, "individual" | "dealer"> = {
  particular: "individual",
  loja: "dealer",
};
const sellerType = (v: unknown): "individual" | "dealer" | null =>
  typeof v === "string" ? (SELLER_TYPE_MAP[v] ?? null) : null;

/** Inglês (API) -> português (`anuncios.tipo_anunciante`, filtros SQL). */
export function unmapSellerType(v: "individual" | "dealer" | undefined): "particular" | "loja" | null {
  if (v === "individual") return "particular";
  if (v === "dealer") return "loja";
  return null;
}

/** Linha de `fila_do_dia` (docs/MODELO.md) -> item de lista da API (docs/API.md
 * `Pick<Vehicle, "id"|"listings"|"state"|"score"|"fipeDiscountPct"|
 * "daysListed"|"compatibleCustomersCount"|"sellerId">`, achatado). */
export function mapQueueRow(row: Record<string, unknown>) {
  return {
    id: num(row.veiculo_id),
    state: row.estado,
    discardReason: row.motivo_descarte,
    sellerId: num(row.vendedor_id),
    sellerName: row.vendedor_nome ?? null,
    sellerMaskedPhone: row.vendedor_telefone_e164 !== undefined ? maskPhone(row.vendedor_telefone_e164 as string | null) : null,
    consignador: (row.consignador as string | null) ?? null,
    consignadorId: num(row.consignador_id),
    lockedUntil: (row.travado_ate as string | null) ?? null,
    lastContactedAt: (row.ultimo_contato_em as string | null) ?? null,
    followUpAt: (row.follow_up_em as string | null) ?? null,
    fipeDiscountPct: num(row.desconto_fipe_pct),
    fipeDiscountCents: num(row.desconto_fipe_reais),
    fipeMatchConfidence: num(row.fipe_confianca),
    daysListed: num(row.dias_no_ar),
    compatibleCustomersCount: num(row.clientes_compativeis),
    listingsCount: num(row.total_fontes),
    // Pré-calculados na fila_do_dia (migration 0013): a tela mostra "caiu
    // R$ 3.000" sem subquery em tempo de request.
    previousPriceCents: num(row.preco_anterior),
    priceChangeCents: num(row.preco_variacao),
    priceChangedAt: row.preco_mudou_em ?? null,
    priceDropCount: num(row.quedas_de_preco) ?? 0,
    score:
      row.score_total === null
        ? null
        : {
            vehicleId: num(row.veiculo_id),
            total: num(row.score_total),
            band: row.score_faixa,
            components: row.score_componentes,
            calculatedAt: row.score_calculado_em,
          },
    listing: {
      id: num(row.anuncio_id),
      source: row.fonte,
      url: (row.anuncio_url as string | null) ?? (row.url as string | null) ?? "",
      normalizedTitle: row.titulo_normalizado,
      brand: row.marca,
      model: row.modelo,
      trim: row.versao,
      manufactureYear: row.ano_fabricacao,
      modelYear: row.ano_modelo,
      km: row.km,
      priceCents: num(row.preco),
      transmission: row.cambio,
      fuelType: row.combustivel,
      color: row.cor,
      city: row.cidade,
      stateCode: row.uf,
      photos: row.fotos,
      sellerType: sellerType(row.tipo_anunciante),
      active: row.ativo,
      deactivatedAt: row.desativado_em ?? null,
      pendingFields: row.pendencias,
    },
  };
}

export function mapListing(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    source: row.fonte,
    externalId: row.id_externo,
    url: row.url,
    originalTitle: row.titulo_original,
    normalizedTitle: row.titulo_normalizado,
    brand: row.marca,
    model: row.modelo,
    trim: row.versao,
    manufactureYear: row.ano_fabricacao,
    modelYear: row.ano_modelo,
    km: row.km,
    priceCents: num(row.preco),
    transmission: row.cambio,
    fuelType: row.combustivel,
    color: row.cor,
    city: row.cidade,
    stateCode: row.uf,
    photos: row.fotos,
    sellerType: sellerType(row.tipo_anunciante),
    fingerprint: row.fingerprint,
    contentHash: row.content_hash,
    pendingFields: row.pendencias,
    firstSeenAt: row.primeira_vista_em,
    lastSeenAt: row.ultima_vista_em,
    active: row.ativo,
    deactivatedAt: row.desativado_em ?? null,
  };
}

export function mapPriceHistoryPoint(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    listingId: num(row.anuncio_id),
    priceCents: num(row.preco),
    observedAt: row.observado_em,
  };
}

export function mapVehicleDetail(
  vehicle: Record<string, unknown>,
  listings: Record<string, unknown>[],
  priceHistory: Record<string, unknown>[],
  extra: { daysListed: number; compatibleCustomersCount: number },
) {
  return {
    id: num(vehicle.id),
    fingerprint: vehicle.fingerprint,
    listings: listings.map(mapListing),
    primaryListingId: num(vehicle.anuncio_principal_id),
    state: vehicle.estado,
    discardReason: vehicle.motivo_descarte,
    returnTrigger: vehicle.gatilho_retorno_tipo
      ? { kind: vehicle.gatilho_retorno_tipo, value: num(vehicle.gatilho_retorno_valor) }
      : null,
    fipeDiscountPct: num(vehicle.desconto_fipe_pct),
    fipeDiscountCents: num(vehicle.desconto_fipe_reais),
    fipeAdjustedCents: num(vehicle.fipe_ajustada),
    fipeMatchConfidence: num(vehicle.fipe_confianca),
    fipeMatchCandidates: vehicle.fipe_candidatos ?? null,
    score:
      vehicle.score_total === null || vehicle.score_total === undefined
        ? null
        : {
            vehicleId: num(vehicle.id),
            total: num(vehicle.score_total),
            band: vehicle.score_faixa,
            components: vehicle.score_componentes,
            calculatedAt: vehicle.score_calculado_em,
          },
    priceHistory: priceHistory.map(mapPriceHistoryPoint),
    daysListed: extra.daysListed,
    sellerId: num(vehicle.vendedor_id),
    consignador: (vehicle.consignador as string | null) ?? null,
    consignadorId: num(vehicle.consignador_id),
    lockedUntil: (vehicle.travado_ate as string | null) ?? null,
    lastContactedAt: (vehicle.ultimo_contato_em as string | null) ?? null,
    followUpAt: (vehicle.follow_up_em as string | null) ?? null,
    compatibleCustomersCount: extra.compatibleCustomersCount,
  };
}

/** "+5567980001000" -> "(67) 9****-1000". Nunca expõe o telefone cru —
 * só quem chama /reveal-contact vê o valor completo (seção 4.6/12). */
export function maskPhone(e164: string | null): string | null {
  if (!e164) return null;
  const digits = e164.replace(/\D/g, "").replace(/^55/, "");
  if (digits.length < 10) return null;
  const ddd = digits.slice(0, 2);
  const last4 = digits.slice(-4);
  return `(${ddd}) 9****-${last4}`;
}

export function mapSeller(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    name: row.nome,
    maskedPhone: row.masked_phone ?? null,
    totalListings: row.total_anuncios === undefined ? null : num(row.total_anuncios),
    muted: row.mutado,
    doNotDisturb: row.nao_perturbe,
    lastContactedAt: row.ultimo_contato_em ?? null,
  };
}

export function mapCustomer(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    name: row.nome,
    contact: row.contato,
    source: row.origem,
    owner: row.responsavel,
    notes: row.observacoes,
    createdAt: row.criado_em,
    totalInterests: row.total_interesses === undefined ? undefined : num(row.total_interesses),
    totalMatches: row.total_matches === undefined ? undefined : num(row.total_matches),
  };
}

export function mapInterest(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    customerId: num(row.cliente_id),
    brand: row.marca,
    model: row.modelo,
    yearMin: row.ano_min,
    yearMax: row.ano_max,
    maxKm: row.km_maximo,
    priceMinCents: num(row.preco_min),
    priceMaxCents: num(row.preco_max),
    transmission: row.cambio,
    city: row.cidade,
    priority: row.prioridade,
    validUntil: row.validade_ate,
    status: row.status,
  };
}

export function mapInterestMatch(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    interestId: num(row.interesse_id),
    vehicleId: num(row.veiculo_id),
    matchScore: num(row.score_aderencia),
    state: row.estado,
    createdAt: row.criado_em,
  };
}

export function mapBranch(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    name: row.nome,
    address: row.endereco,
    intakeLimitPerPeriod: num(row.limite_veiculos_por_periodo),
    requestsThisPeriod: row.solicitacoes_no_periodo === undefined ? undefined : num(row.solicitacoes_no_periodo),
  };
}

const CHECKLIST_KEY_MAP: Record<string, string> = {
  documento: "document",
  chaveReserva: "spareKey",
  manual: "manual",
  vistoria: "inspection",
  fotosPadronizadas: "standardPhotos",
  avaliacao: "appraisal",
};

function mapChecklist(raw: Record<string, boolean> | null): Record<string, boolean> | null {
  if (!raw) return null;
  const mapped: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    mapped[CHECKLIST_KEY_MAP[key] ?? key] = value;
  }
  return mapped;
}

const CHECKLIST_KEY_MAP_INVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(CHECKLIST_KEY_MAP).map(([pt, en]) => [en, pt]),
);

/** Inglês (API, domain.ts) -> português (coluna `checklist` jsonb). */
export function unmapChecklist(raw: Record<string, boolean>): Record<string, boolean> {
  const mapped: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    mapped[CHECKLIST_KEY_MAP_INVERSE[key] ?? key] = value;
  }
  return mapped;
}

export function mapRequest(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    vehicleId: num(row.veiculo_id),
    sellerId: num(row.vendedor_id),
    customerId: num(row.cliente_id),
    branchId: num(row.unidade_id),
    owner: row.responsavel,
    proposedAt: iso(row.data_hora_proposta),
    lockedUntil: iso(row.travado_ate),
    state: row.estado,
    lossReason: row.motivo_perda,
    notes: row.observacoes,
    checklist: mapChecklist(row.checklist as Record<string, boolean> | null) ?? {
      document: false,
      spareKey: false,
      manual: false,
      inspection: false,
      standardPhotos: false,
      appraisal: false,
    },
    createdAt: iso(row.criado_em),
    listingUrl: (row.anuncio_url as string | null) ?? null,
    fipeDiscountPct: num(row.desconto_fipe_pct),
    sellerMuted: Boolean(row.vendedor_mutado),
    sellerDoNotDisturb: Boolean(row.vendedor_nao_perturbe),
    sellerHasPhone: Boolean(row.tem_telefone),
    vehicle:
      row.marca !== undefined
        ? { brand: row.marca, model: row.modelo, modelYear: row.ano_modelo, priceCents: num(row.preco) }
        : undefined,
    branchName: row.unidade_nome,
  };
}

export function mapSource(row: Record<string, unknown>) {
  return {
    source: row.fonte,
    accessLevel: ACCESS_LEVEL_MAP[row.nivel_acesso as string] ?? row.nivel_acesso,
    legalBasis: row.base_legal,
    active: row.ativa,
    cursor: row.cursor,
    pausedUntil: row.pausado_ate,
    disabled: row.desativado,
    reason: row.motivo,
    lastRun: row.ultima_execucao ? mapScrapeRun(row.ultima_execucao as Record<string, unknown>) : null,
    pendingRequest: row.pedido_pendente
      ? mapScrapeRequest(row.pedido_pendente as Record<string, unknown>)
      : null,
  };
}

/** Linha de `execucoes_solicitadas` (docs/MODELO.md — Fase 4). */
export function mapScrapeRequest(row: Record<string, unknown>) {
  const progress = mapScrapeProgress(row.progresso as Record<string, unknown> | null);
  const requestedAt = iso(row.solicitado_em);
  const startedAt = iso(row.iniciado_em);
  return {
    id: num(row.id),
    source: row.fonte,
    sellerType: sellerType(row.tipo_anunciante_filtro),
    limit: num(row.limite),
    requestedBy: row.solicitado_por,
    requestedAt,
    startedAt,
    processedAt: iso(row.processado_em),
    scrapeRunId: row.scrape_run_id === null || row.scrape_run_id === undefined ? null : num(row.scrape_run_id),
    progress,
    phase: scrapePhase({
      requestedAt,
      startedAt,
      hasProgress: progress !== null,
    }),
  };
}

/** `execucoes_solicitadas.progresso`: o coletor grava enquanto roda. Vazio
 * (`{}`) significa "pegou o pedido e ainda não reportou". */
function mapScrapeProgress(raw: Record<string, unknown> | null | undefined) {
  if (!raw || Object.keys(raw).length === 0) return null;
  return {
    onlineCount: num(raw.no_ar) ?? 0,
    pages: num(raw.paginas) ?? 0,
    requests: num(raw.requisicoes) ?? 0,
    new: num(raw.novos) ?? 0,
    updated: num(raw.atualizados) ?? 0,
    priceChanges: num(raw.precos_alterados) ?? 0,
    unchanged: num(raw.inalterados) ?? 0,
    deactivated: num(raw.desativados) ?? 0,
    errors: num(raw.erros) ?? 0,
  };
}

const ACCESS_LEVEL_MAP: Record<string, string> = {
  feed_oficial: "official_feed",
  autorizado: "authorized",
  publico_educado: "public_polite",
  manual: "manual",
};

export function mapScrapeRun(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    source: row.fonte,
    startedAt: row.iniciado_em,
    finishedAt: row.finalizado_em,
    requests: num(row.requisicoes),
    notModified: num(row.nao_modificados),
    new: num(row.novos),
    updated: num(row.atualizados),
    unchanged: num(row.inalterados),
    needsReview: num(row.revisao),
    errors: num(row.erros),
    endedBy: row.encerrado_por,
    sellerTypeFilter: sellerType(row.tipo_anunciante_filtro),
    deactivated: num(row.desativados) ?? 0,
    priceChanges: num(row.precos_alterados) ?? 0,
    skippedByFilter: num(row.ignorados_filtro) ?? 0,
  };
}

export function mapSettings(row: Record<string, unknown>) {
  return {
    weights: row.pesos,
    bandThresholds: row.faixas,
    discardReasons: row.motivos_descarte,
    returnTriggerPricePct: num(row.gatilho_retorno_pct),
    returnTriggerDays: num(row.gatilho_retorno_dias),
    sellerCooldownHours: num(row.cooldown_vendedor_horas),
    followUpDays: row.follow_up_dias,
    kmCurve: row.curva_km,
    whatsappTemplate: row.template_whatsapp,
    allowedHoursStart: row.horario_permitido_inicio,
    allowedHoursEnd: row.horario_permitido_fim,
    version: num(row.versao),
  };
}

export function mapAuditRecord(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    action: row.acao,
    author: row.autor,
    targetType: row.alvo_tipo,
    targetId: row.alvo_id,
    detail: row.detalhe,
    createdAt: row.criado_em,
  };
}

export function mapWebhook(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    url: row.url,
    events: row.eventos,
    active: row.ativo,
    lastDeliveryAt: row.ultima_entrega_em ?? null,
    lastDeliveryStatus: row.ultima_entrega_status ?? null,
  };
}

export function mapWebhookDelivery(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    webhookId: num(row.webhook_id),
    event: row.evento,
    payload: row.payload,
    attempt: num(row.tentativa),
    statusHttp: num(row.status_http),
    success: row.sucesso,
    createdAt: row.criado_em,
  };
}

export function mapFipeReviewItem(row: Record<string, unknown>) {
  return {
    id: num(row.id),
    fipeMatchConfidence: num(row.fipe_confianca),
    fipeMatchCandidates: row.fipe_candidatos ?? null,
    brand: row.marca,
    model: row.modelo,
    trim: row.versao,
    modelYear: row.ano_modelo,
    priceCents: num(row.preco),
    normalizedTitle: row.titulo_normalizado,
  };
}

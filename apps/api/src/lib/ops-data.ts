import type {
  OpsDealRow,
  OpsKpi,
  OpsOperatorRow,
  OpsOverview,
  OpsRange,
} from "@veiculo/types";

import { pool } from "../db.js";
import { decodeCursor, encodeCursor } from "./pagination.js";
import {
  closeRate,
  conversionRate,
  fillDailySeries,
  hoursFromSeconds,
} from "./ops.js";

const OPEN_SQL = `s.estado NOT IN ('closed', 'declined', 'no_show')`;
const DEADLINE_SQL = `CASE
  WHEN s.estado IN ('requested', 'accepted') THEN v.travado_ate
  ELSE s.data_hora_proposta
END`;
const PREVIEW_LIMIT = 12;

export interface OpsQuery {
  range: OpsRange;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  operatorId?: number;
  sellerType?: "particular" | "loja";
}

class Bind {
  values: unknown[] = [];
  ph(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function nNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function iso(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function kpi(value: number, previous: number | null, unit: OpsKpi["unit"], formula: string): OpsKpi {
  return { value, previous, unit, formula };
}

async function operatorLogin(operatorId: number | undefined): Promise<string | undefined> {
  if (!operatorId) return undefined;
  const { rows } = await pool.query("SELECT login FROM operadores WHERE id = $1", [operatorId]);
  return (rows[0]?.login as string | undefined) ?? "__nenhum__";
}

function sellerOnAnuncio(alias: string, seller: string | undefined, bind: Bind): string {
  if (!seller) return "";
  return `AND ${alias}.tipo_anunciante = ${bind.ph(seller)}`;
}

function sellerOnVehicle(alias: string, seller: string | undefined, bind: Bind): string {
  if (!seller) return "";
  return `AND EXISTS (
    SELECT 1 FROM anuncios an
     WHERE an.id = ${alias}.anuncio_principal_id
       AND an.tipo_anunciante = ${bind.ph(seller)}
  )`;
}

function ownerOnVehicle(alias: string, operatorId: number | undefined, bind: Bind): string {
  if (!operatorId) return "";
  return `AND ${alias}.consignador_id = ${bind.ph(operatorId)}`;
}

function authorOnAudit(alias: string, login: string | undefined, bind: Bind): string {
  if (!login) return "";
  return `AND ${alias}.autor = ${bind.ph(login)}`;
}

function auditSeller(alias: string, seller: string | undefined, bind: Bind): string {
  if (!seller) return "";
  return `AND ${alias}.alvo_tipo = 'vehicle' AND EXISTS (
    SELECT 1 FROM veiculos vx
    JOIN anuncios ax ON ax.id = vx.anuncio_principal_id
    WHERE vx.id::text = ${alias}.alvo_id
      AND ax.tipo_anunciante = ${bind.ph(seller)}
  )`;
}

function titleOf(row: Record<string, unknown>): string {
  return [row.marca, row.modelo, row.ano_modelo].filter((p) => p !== null && p !== undefined && p !== "").join(" ");
}

function mapDeal(row: Record<string, unknown>): OpsDealRow {
  return {
    requestId: n(row.id),
    vehicleId: n(row.veiculo_id),
    title: titleOf(row) || `Veículo #${n(row.veiculo_id)}`,
    owner: typeof row.consignador === "string" && row.consignador ? row.consignador : "—",
    ownerId: nNull(row.consignador_id),
    state: String(row.estado ?? ""),
    deadline: iso(row.deadline),
    visitAt: iso(row.data_hora_proposta),
  };
}

const DEAL_SELECT = `
  SELECT s.id, s.veiculo_id, s.estado, s.data_hora_proposta,
         v.travado_ate, v.consignador, v.consignador_id,
         a.marca, a.modelo, a.ano_modelo,
         ${DEADLINE_SQL} AS deadline
    FROM solicitacoes_captacao s
    JOIN veiculos v ON v.id = s.veiculo_id
    LEFT JOIN anuncios a ON a.id = v.anuncio_principal_id
`;

export async function loadOpsOverview(q: OpsQuery): Promise<OpsOverview> {
  const login = await operatorLogin(q.operatorId);

  const events = new Bind();
  const from = events.ph(q.from);
  const to = events.ph(q.to);
  const prevFrom = events.ph(q.prevFrom);
  const prevTo = events.ph(q.prevTo);
  const author = authorOnAudit("a", login, events);
  const sellerA = auditSeller("a", q.sellerType, events);

  const snap = new Bind();
  const sellerF = sellerOnAnuncio("f", q.sellerType, snap);
  const sellerV = sellerOnVehicle("v", q.sellerType, snap);
  const ownerV = ownerOnVehicle("v", q.operatorId, snap);
  const ownerF = ownerOnVehicle("f", q.operatorId, snap);
  const fromS = snap.ph(q.from);
  const toS = snap.ph(q.to);
  const prevFromS = snap.ph(q.prevFrom);
  const prevToS = snap.ph(q.prevTo);

  const daily = new Bind();
  const fromD = daily.ph(q.from);
  const toD = daily.ph(q.to);
  const authorD = authorOnAudit("a", login, daily);
  const sellerD = auditSeller("a", q.sellerType, daily);

  const rank = new Bind();
  const fromR = rank.ph(q.from);
  const toR = rank.ph(q.to);
  const sellerEv = q.sellerType
    ? `AND a.alvo_tipo = 'vehicle' AND EXISTS (
         SELECT 1 FROM veiculos vx
         JOIN anuncios ax ON ax.id = vx.anuncio_principal_id
         WHERE vx.id::text = a.alvo_id AND ax.tipo_anunciante = ${rank.ph(q.sellerType)}
       )`
    : "";
  const sellerPipe = q.sellerType
    ? `AND EXISTS (
         SELECT 1 FROM anuncios ax
          WHERE ax.id = v.anuncio_principal_id AND ax.tipo_anunciante = ${rank.ph(q.sellerType)}
       )`
    : "";

  const reasons = new Bind();
  const fromX = reasons.ph(q.from);
  const toX = reasons.ph(q.to);
  const authorX = authorOnAudit("a", login, reasons);
  const sellerX = auditSeller("a", q.sellerType, reasons);

  const brands = new Bind();
  const sellerB = sellerOnAnuncio("f", q.sellerType, brands);
  const ownerB = ownerOnVehicle("f", q.operatorId, brands);

  const overdueB = new Bind();
  const ownerO = ownerOnVehicle("v", q.operatorId, overdueB);
  const sellerO = sellerOnVehicle("v", q.sellerType, overdueB);
  overdueB.values.push(PREVIEW_LIMIT);

  const visitsB = new Bind();
  const ownerVi = ownerOnVehicle("v", q.operatorId, visitsB);
  const sellerVi = sellerOnVehicle("v", q.sellerType, visitsB);
  visitsB.values.push(PREVIEW_LIMIT);

  const collect = new Bind();
  const fromC = collect.ph(q.from);
  const toC = collect.ph(q.to);
  const sellerC = sellerOnAnuncio("an", q.sellerType, collect);

  const [
    eventsRes,
    snapRes,
    dailyRes,
    rankRes,
    reasonsRes,
    brandsRes,
    overdueRes,
    visitsRes,
    collectRes,
  ] = await Promise.all([
    pool.query(
      `SELECT
          count(*) FILTER (WHERE a.criado_em >= ${from} AND a.criado_em < ${to} AND a.acao = 'claim')::int AS claims,
          count(*) FILTER (WHERE a.criado_em >= ${from} AND a.criado_em < ${to}
            AND a.acao = 'parecer' AND a.detalhe = 'consignou')::int AS consigned,
          count(*) FILTER (WHERE a.criado_em >= ${from} AND a.criado_em < ${to}
            AND a.acao = 'parecer' AND a.detalhe LIKE 'devolveu:%')::int AS returned,
          count(*) FILTER (WHERE a.criado_em >= ${prevFrom} AND a.criado_em < ${prevTo} AND a.acao = 'claim')::int AS claims_prev,
          count(*) FILTER (WHERE a.criado_em >= ${prevFrom} AND a.criado_em < ${prevTo}
            AND a.acao = 'parecer' AND a.detalhe = 'consignou')::int AS consigned_prev,
          count(*) FILTER (WHERE a.criado_em >= ${prevFrom} AND a.criado_em < ${prevTo}
            AND a.acao = 'parecer' AND a.detalhe LIKE 'devolveu:%')::int AS returned_prev
         FROM auditoria a
        WHERE a.acao IN ('claim', 'parecer')
          ${author}
          ${sellerA}`,
      events.values,
    ),
    pool.query(
      `SELECT
          (SELECT count(*) FROM veiculos v
            WHERE v.estado = 'acquired' ${sellerV} ${ownerV})::int AS stock,
          (SELECT count(*) FROM solicitacoes_captacao s
            JOIN veiculos v ON v.id = s.veiculo_id
           WHERE ${OPEN_SQL} ${sellerV} ${ownerV})::int AS pipeline,
          (SELECT count(*) FROM solicitacoes_captacao s
            JOIN veiculos v ON v.id = s.veiculo_id
           WHERE ${OPEN_SQL} ${sellerV} ${ownerV}
             AND ${DEADLINE_SQL} IS NOT NULL
             AND ${DEADLINE_SQL} <= now())::int AS overdue,
          (SELECT count(*) FROM fila_do_dia f
            WHERE f.ativo AND f.estado NOT IN ('discarded', 'lost', 'acquired') ${sellerF})::int AS online,
          (SELECT avg(f.preco) FROM fila_do_dia f
            WHERE f.estado = 'acquired' ${sellerF} ${ownerF}) AS avg_ticket,
          (SELECT avg(f.desconto_fipe_pct) FROM fila_do_dia f
            WHERE f.estado = 'acquired' AND f.desconto_fipe_pct IS NOT NULL ${sellerF} ${ownerF}) AS avg_fipe,
          (SELECT count(*) FROM solicitacoes_captacao s
            JOIN veiculos v ON v.id = s.veiculo_id
           WHERE s.data_hora_proposta >= ${fromS} AND s.data_hora_proposta < ${toS}
             ${sellerV} ${ownerV})::int AS visits,
          (SELECT count(*) FROM solicitacoes_captacao s
            JOIN veiculos v ON v.id = s.veiculo_id
           WHERE s.data_hora_proposta >= ${prevFromS} AND s.data_hora_proposta < ${prevToS}
             ${sellerV} ${ownerV})::int AS visits_prev,
          (SELECT count(*) FROM fila_do_dia f
            WHERE f.ativo
              AND f.estado NOT IN ('discarded', 'lost', 'acquired')
              AND NOT EXISTS (
                SELECT 1 FROM solicitacoes_captacao s
                 WHERE s.veiculo_id = f.veiculo_id
                   AND s.estado NOT IN ('closed', 'declined', 'no_show')
              )
              AND (f.consignador_id IS NULL OR f.travado_ate IS NULL OR f.travado_ate < now())
              ${sellerF})::int AS livres,
          (SELECT count(*) FROM solicitacoes_captacao s
            JOIN veiculos v ON v.id = s.veiculo_id
           WHERE s.estado IN ('requested', 'accepted') ${sellerV} ${ownerV})::int AS proposta,
          (SELECT count(*) FROM solicitacoes_captacao s
            JOIN veiculos v ON v.id = s.veiculo_id
           WHERE s.estado IN ('scheduled', 'vehicle_at_branch', 'under_evaluation', 'offer_made')
             ${sellerV} ${ownerV})::int AS agendado`,
      snap.values,
    ),
    pool.query(
      `SELECT to_char(a.criado_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS day,
              count(*) FILTER (WHERE a.acao = 'parecer' AND a.detalhe = 'consignou')::int AS consigned,
              count(*) FILTER (WHERE a.acao = 'parecer' AND a.detalhe LIKE 'devolveu:%')::int AS returned,
              count(*) FILTER (WHERE a.acao = 'claim')::int AS claims
         FROM auditoria a
        WHERE a.acao IN ('claim', 'parecer')
          AND a.criado_em >= ${fromD} AND a.criado_em < ${toD}
          ${authorD}
          ${sellerD}
        GROUP BY 1
        ORDER BY 1`,
      daily.values,
    ),
    pool.query(
      `WITH eventos AS (
          SELECT a.autor,
                 count(*) FILTER (WHERE a.acao = 'claim')::int AS claims,
                 count(*) FILTER (WHERE a.acao = 'parecer' AND a.detalhe = 'consignou')::int AS consigned,
                 count(*) FILTER (WHERE a.acao = 'parecer' AND a.detalhe LIKE 'devolveu:%')::int AS returned
            FROM auditoria a
           WHERE a.acao IN ('claim', 'parecer')
             AND a.criado_em >= ${fromR} AND a.criado_em < ${toR}
             ${sellerEv}
           GROUP BY a.autor
        ),
        pipeline AS (
          SELECT v.consignador_id,
                 count(*)::int AS open,
                 count(*) FILTER (
                   WHERE ${DEADLINE_SQL} IS NOT NULL AND ${DEADLINE_SQL} <= now()
                 )::int AS overdue
            FROM solicitacoes_captacao s
            JOIN veiculos v ON v.id = s.veiculo_id
           WHERE ${OPEN_SQL}
             ${sellerPipe}
           GROUP BY v.consignador_id
        ),
        tempo AS (
          SELECT s.responsavel,
                 avg(EXTRACT(EPOCH FROM (s.atualizado_em - s.criado_em))) AS avg_secs
            FROM solicitacoes_captacao s
           WHERE s.estado IN ('closed', 'declined')
             AND s.atualizado_em >= ${fromR} AND s.atualizado_em < ${toR}
           GROUP BY s.responsavel
        ),
        visitas AS (
          SELECT s.responsavel, count(*)::int AS visits
            FROM solicitacoes_captacao s
           WHERE s.data_hora_proposta >= ${fromR} AND s.data_hora_proposta < ${toR}
           GROUP BY s.responsavel
        )
       SELECT o.id, o.nome, o.login, o.ativo,
              COALESCE(e.claims, 0) AS claims,
              COALESCE(e.consigned, 0) AS consigned,
              COALESCE(e.returned, 0) AS returned,
              COALESCE(p.open, 0) AS open,
              COALESCE(p.overdue, 0) AS overdue,
              t.avg_secs,
              COALESCE(vi.visits, 0) AS visits
         FROM operadores o
         LEFT JOIN eventos e ON e.autor = o.login
         LEFT JOIN pipeline p ON p.consignador_id = o.id
         LEFT JOIN tempo t ON t.responsavel = o.login
         LEFT JOIN visitas vi ON vi.responsavel = o.login
        WHERE o.ativo
           OR COALESCE(e.claims, 0) + COALESCE(e.consigned, 0) + COALESCE(e.returned, 0) > 0
           OR COALESCE(p.open, 0) > 0
        ORDER BY COALESCE(e.consigned, 0) DESC, COALESCE(e.claims, 0) DESC, o.nome ASC`,
      rank.values,
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(btrim(regexp_replace(a.detalhe, '^devolveu:\\s*', '')), ''), 'sem motivo') AS reason,
              count(*)::int AS count
         FROM auditoria a
        WHERE a.acao = 'parecer'
          AND a.detalhe LIKE 'devolveu:%'
          AND a.criado_em >= ${fromX} AND a.criado_em < ${toX}
          ${authorX}
          ${sellerX}
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 8`,
      reasons.values,
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(btrim(f.marca), ''), 'Sem marca') AS reason,
              count(*)::int AS count
         FROM fila_do_dia f
        WHERE f.estado = 'acquired'
          ${sellerB}
          ${ownerB}
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 6`,
      brands.values,
    ),
    pool.query(
      `${DEAL_SELECT}
        WHERE ${OPEN_SQL}
          ${ownerO}
          ${sellerO}
          AND ${DEADLINE_SQL} IS NOT NULL
          AND ${DEADLINE_SQL} <= now()
        ORDER BY ${DEADLINE_SQL} ASC, s.id ASC
        LIMIT $${overdueB.values.length}`,
      overdueB.values,
    ),
    pool.query(
      `${DEAL_SELECT}
        WHERE ${OPEN_SQL}
          ${ownerVi}
          ${sellerVi}
          AND s.data_hora_proposta IS NOT NULL
          AND s.data_hora_proposta >= now()
          AND s.data_hora_proposta <= now() + interval '48 hours'
        ORDER BY s.data_hora_proposta ASC, s.id ASC
        LIMIT $${visitsB.values.length}`,
      visitsB.values,
    ),
    pool.query(
      `SELECT
          (SELECT json_build_object(
              'finished_at', r.finalizado_em,
              'source', r.fonte,
              'novos', r.novos,
              'erros', r.erros
            )
             FROM scrape_runs r
            ORDER BY r.finalizado_em DESC
            LIMIT 1) AS last_run,
          (SELECT count(*) FROM veiculos v
            WHERE (v.fipe_confianca IS NULL OR v.fipe_confianca < 0.85)
              AND v.estado NOT IN ('discarded', 'lost', 'acquired'))::int AS fipe_pending,
          (SELECT count(*) FROM anuncios an
            WHERE an.primeira_vista_em >= ${fromC} AND an.primeira_vista_em < ${toC}
              ${sellerC})::int AS new_listings`,
      collect.values,
    ),
  ]);

  const ev = eventsRes.rows[0] ?? {};
  const sn = snapRes.rows[0] ?? {};
  const lastRun = collectRes.rows[0]?.last_run as
    | { finished_at: string; source: string; novos: number; erros: number }
    | null;

  const consigned = n(ev.consigned);
  const returned = n(ev.returned);
  const claims = n(ev.claims);
  const consignedPrev = n(ev.consigned_prev);
  const returnedPrev = n(ev.returned_prev);
  const claimsPrev = n(ev.claims_prev);
  const conversion = conversionRate(consigned, returned);
  const conversionPrev = conversionRate(consignedPrev, returnedPrev);
  const close = closeRate(consigned, claims);
  const closePrev = closeRate(consignedPrev, claimsPrev);
  const stock = n(sn.stock);
  const pipeline = n(sn.pipeline);
  const overdue = n(sn.overdue);
  const visits = n(sn.visits);
  const livres = n(sn.livres);
  const proposta = n(sn.proposta);
  const agendado = n(sn.agendado);

  const ranking: OpsOperatorRow[] = rankRes.rows.map((row) => {
    const c = n(row.consigned);
    const r = n(row.returned);
    const cl = n(row.claims);
    return {
      operatorId: n(row.id),
      name: String(row.nome ?? ""),
      login: String(row.login ?? ""),
      active: Boolean(row.ativo),
      claims: cl,
      consigned: c,
      returned: r,
      conversion: conversionRate(c, r),
      closeRate: closeRate(c, cl),
      open: n(row.open),
      overdue: n(row.overdue),
      avgHoursToParecer: hoursFromSeconds(nNull(row.avg_secs)),
      visits: n(row.visits),
    };
  });

  return {
    from: q.from.toISOString(),
    to: q.to.toISOString(),
    range: q.range,
    kpis: {
      stockTotal: kpi(
        stock,
        null,
        "count",
        "Saldo agora: veículos com estado acquired. Não é do período — não há histórico diário de estoque.",
      ),
      consignedPeriod: kpi(
        consigned,
        consignedPrev,
        "count",
        "Auditoria: ação parecer e detalhe exatamente consignou, no período.",
      ),
      returnedPeriod: kpi(
        returned,
        returnedPrev,
        "count",
        "Auditoria: ação parecer e detalhe começando com devolveu:, no período.",
      ),
      conversion: kpi(
        conversion ?? 0,
        conversionPrev ?? 0,
        "rate",
        "consignou ÷ (consignou + devolveu). Sem encerramento no período = 0.",
      ),
      pipelineOpen: kpi(
        pipeline,
        null,
        "count",
        "Solicitações abertas: estado diferente de closed, declined e no_show.",
      ),
      overdue: kpi(
        overdue,
        null,
        "count",
        "Abertas com prazo ≤ agora. Até Agendado vale travado_ate (2h); depois vale a visita.",
      ),
      claims: kpi(claims, claimsPrev, "count", "Auditoria: ação claim no período (assumiu a tratativa)."),
      closeRate: kpi(
        close ?? 0,
        closePrev ?? 0,
        "rate",
        "consignou ÷ assumiu. Sem claim no período = 0.",
      ),
      avgTicketCents: kpi(
        Math.round(n(sn.avg_ticket)),
        null,
        "cents",
        "Média do preço do estoque consignado (fila_do_dia.preco, já em centavos).",
      ),
      avgFipeDiscountPct: kpi(
        n(sn.avg_fipe),
        null,
        "pct",
        "Média do desconto FIPE do estoque (pré-calculado no worker, não no request).",
      ),
      visits: kpi(
        visits,
        n(sn.visits_prev),
        "count",
        "Solicitações cuja data_hora_proposta cai no período.",
      ),
      online: kpi(
        n(sn.online),
        null,
        "count",
        "Anúncios ativos fora de estoque, descarte e perda (fila_do_dia).",
      ),
    },
    funnel: [
      { key: "free", label: "Livres", count: livres },
      { key: "pipeline", label: "Tratativa", count: proposta },
      { key: "scheduled", label: "Agendado", count: agendado },
      { key: "stock", label: "Estoque", count: stock },
    ],
    daily: fillDailySeries(
      q.from,
      q.to,
      dailyRes.rows.map((row) => ({
        day: String(row.day),
        consigned: n(row.consigned),
        returned: n(row.returned),
        claims: n(row.claims),
      })),
    ),
    ranking,
    returnReasons: reasonsRes.rows.map((row) => ({
      reason: String(row.reason),
      count: n(row.count),
    })),
    kanbanNow: [
      { key: "requested", label: "Proposta", count: proposta },
      { key: "scheduled", label: "Agendado", count: agendado },
      { key: "closed", label: "Estoque", count: stock },
    ],
    stockBrands: brandsRes.rows.map((row) => ({
      reason: String(row.reason),
      count: n(row.count),
    })),
    overdueItems: overdueRes.rows.map((row) => mapDeal(row as Record<string, unknown>)),
    upcomingVisits: visitsRes.rows.map((row) => mapDeal(row as Record<string, unknown>)),
    collection: {
      lastRunAt: iso(lastRun?.finished_at ?? null),
      source: lastRun?.source ?? null,
      novos: n(lastRun?.novos),
      erros: n(lastRun?.erros),
      fipePending: n(collectRes.rows[0]?.fipe_pending),
      newListingsPeriod: n(collectRes.rows[0]?.new_listings),
    },
  };
}

export async function loadOpsOverdue(
  q: Pick<OpsQuery, "operatorId" | "sellerType">,
  cursor: string | undefined,
  limit: number,
): Promise<{ items: OpsDealRow[]; nextCursor: string | null }> {
  const bind = new Bind();
  const owner = ownerOnVehicle("v", q.operatorId, bind);
  const seller = sellerOnVehicle("v", q.sellerType, bind);
  const parts = decodeCursor(cursor);
  let cursorSql = "";
  if (parts && parts.length >= 2) {
    const deadline = iso(parts[0]);
    const id = Number(parts[1]);
    if (deadline && Number.isFinite(id)) {
      const d = bind.ph(deadline);
      const i = bind.ph(id);
      cursorSql = `AND (${DEADLINE_SQL} > ${d}::timestamptz OR (${DEADLINE_SQL} = ${d}::timestamptz AND s.id > ${i}))`;
    }
  }
  const lim = bind.ph(limit);
  const { rows } = await pool.query(
    `${DEAL_SELECT}
      WHERE ${OPEN_SQL}
        ${owner}
        ${seller}
        AND ${DEADLINE_SQL} IS NOT NULL
        AND ${DEADLINE_SQL} <= now()
        ${cursorSql}
      ORDER BY ${DEADLINE_SQL} ASC, s.id ASC
      LIMIT ${lim}`,
    bind.values,
  );
  const last = rows[rows.length - 1] as Record<string, unknown> | undefined;
  return {
    items: rows.map((row) => mapDeal(row as Record<string, unknown>)),
    nextCursor:
      rows.length === limit && last && last.deadline
        ? encodeCursor([iso(last.deadline) ?? "", n(last.id)])
        : null,
  };
}

export async function loadOpsVisits(
  q: Pick<OpsQuery, "operatorId" | "sellerType">,
  cursor: string | undefined,
  limit: number,
): Promise<{ items: OpsDealRow[]; nextCursor: string | null }> {
  const bind = new Bind();
  const owner = ownerOnVehicle("v", q.operatorId, bind);
  const seller = sellerOnVehicle("v", q.sellerType, bind);
  const parts = decodeCursor(cursor);
  let cursorSql = "";
  if (parts && parts.length >= 2) {
    const when = iso(parts[0]);
    const id = Number(parts[1]);
    if (when && Number.isFinite(id)) {
      const d = bind.ph(when);
      const i = bind.ph(id);
      cursorSql = `AND (s.data_hora_proposta > ${d}::timestamptz OR (s.data_hora_proposta = ${d}::timestamptz AND s.id > ${i}))`;
    }
  }
  const lim = bind.ph(limit);
  const { rows } = await pool.query(
    `${DEAL_SELECT}
      WHERE ${OPEN_SQL}
        ${owner}
        ${seller}
        AND s.data_hora_proposta IS NOT NULL
        AND s.data_hora_proposta >= now()
        AND s.data_hora_proposta <= now() + interval '48 hours'
        ${cursorSql}
      ORDER BY s.data_hora_proposta ASC, s.id ASC
      LIMIT ${lim}`,
    bind.values,
  );
  const last = rows[rows.length - 1] as Record<string, unknown> | undefined;
  return {
    items: rows.map((row) => mapDeal(row as Record<string, unknown>)),
    nextCursor:
      rows.length === limit && last && last.data_hora_proposta
        ? encodeCursor([iso(last.data_hora_proposta) ?? "", n(last.id)])
        : null,
  };
}

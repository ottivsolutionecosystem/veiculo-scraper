import type { Source, ScrapeRun } from "@veiculo/types";

// Espelha services/collector/captacao_bot/config.py::FONTES — mesmos nomes,
// mesmo estado (shopcar ativa; webmotors e olx nascem desligadas).
export const SOURCES: Source[] = [
  {
    source: "shopcar",
    accessLevel: "public_polite",
    legalBasis: "robots.txt permite; autorização solicitada por e-mail em 12/07/2026",
    active: true,
    cursor: "pagina-14",
    pausedUntil: null,
    disabled: false,
    reason: null,
  },
  {
    source: "webmotors",
    accessLevel: "authorized",
    legalBasis: "PENDENTE — homologação Sensedia / API Marketplace",
    active: false,
    cursor: null,
    pausedUntil: null,
    disabled: false,
    reason: "Aguardando homologação no portal de desenvolvedores.",
  },
  {
    source: "olx",
    accessLevel: "manual",
    legalBasis: "entrada manual pelo usuário; sem coleta automatizada",
    active: false,
    cursor: null,
    pausedUntil: null,
    disabled: false,
    reason: "Modo manual — usuário cola a URL do anúncio no painel.",
  },
];

const isoDaysAgo = (n: number, h = 6) => new Date(Date.UTC(2026, 7, 17 - n, h)).toISOString();

export const SCRAPE_RUNS: ScrapeRun[] = [
  { id: 1, source: "shopcar", startedAt: isoDaysAgo(0, 3), finishedAt: isoDaysAgo(0, 3), requests: 214, notModified: 168, new: 6, updated: 12, unchanged: 190, needsReview: 4, errors: 1, endedBy: "early stop (25 conhecidos)" },
  { id: 2, source: "shopcar", startedAt: isoDaysAgo(1, 3), finishedAt: isoDaysAgo(1, 3), requests: 198, notModified: 150, new: 9, updated: 8, unchanged: 172, needsReview: 3, errors: 0, endedBy: "fim" },
  { id: 3, source: "shopcar", startedAt: isoDaysAgo(2, 3), finishedAt: isoDaysAgo(2, 3), requests: 240, notModified: 201, new: 11, updated: 15, unchanged: 205, needsReview: 6, errors: 2, endedBy: "fim" },
  { id: 4, source: "shopcar", startedAt: isoDaysAgo(3, 3), finishedAt: isoDaysAgo(3, 3), requests: 60, notModified: 60, new: 0, updated: 0, unchanged: 60, needsReview: 0, errors: 0, endedBy: "circuito aberto: HTTP 429 repetido" },
];

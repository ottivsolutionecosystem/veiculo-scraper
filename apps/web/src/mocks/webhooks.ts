import type { Webhook } from "@veiculo/types";

const isoDaysAgo = (n: number, h = 8) => new Date(Date.UTC(2026, 7, 17 - n, h)).toISOString();

export const WEBHOOKS: Webhook[] = [
  {
    id: "webhook-1",
    url: "https://hooks.exemplo.com.br/veiculo-scraper",
    events: ["veiculo.novo", "veiculo.preco_caiu", "match.encontrado"],
    active: true,
    lastDeliveryAt: isoDaysAgo(0),
    lastDeliveryStatus: 200,
  },
  {
    id: "webhook-2",
    url: "https://n8n.interno.exemplo.com.br/webhook/captacao",
    events: ["solicitacao.mudou_estado", "coleta.finalizada"],
    active: false,
    lastDeliveryAt: isoDaysAgo(9),
    lastDeliveryStatus: 500,
  },
];

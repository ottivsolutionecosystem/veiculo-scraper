import type { Settings } from "@veiculo/types";

import { formatCents, formatPct } from "./format";
import { phoneDigitsForWhatsapp } from "./contato";

const DEFAULT_TEMPLATE =
  "Olá! Vi o anúncio do seu {{modelo}} {{ano}} por {{preco}} ({{desconto_fipe}} vs FIPE). Trabalhamos com consignação: o carro fica na loja e você recebe na venda. Posso te explicar em dois minutos?";

export function fillWhatsappTemplate(
  template: string | null | undefined,
  vars: {
    brand: string | null;
    model: string | null;
    year: number | null;
    priceCents: number | null;
    fipeDiscountPct: number | null;
  },
): string {
  const modelo = [vars.brand, vars.model].filter(Boolean).join(" ") || "veículo";
  return (template?.trim() || DEFAULT_TEMPLATE)
    .replaceAll("{{modelo}}", modelo)
    .replaceAll("{{ano}}", vars.year ? String(vars.year) : "")
    .replaceAll("{{preco}}", formatCents(vars.priceCents))
    .replaceAll("{{desconto_fipe}}", vars.fipeDiscountPct === null ? "—" : formatPct(vars.fipeDiscountPct));
}

export function whatsappHref(phone: string, text: string): string {
  return `https://wa.me/${phoneDigitsForWhatsapp(phone)}?text=${encodeURIComponent(text)}`;
}

export function templateFromSettings(settings: Settings | null | undefined): string {
  return settings?.whatsappTemplate ?? DEFAULT_TEMPLATE;
}

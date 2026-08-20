/** Canais de saída (ligar / WhatsApp). Mutado e não-perturbe bloqueiam tudo. */

export type ContactBlock = "muted" | "do_not_disturb" | "no_phone";

export function contactBlockReason(input: {
  muted?: boolean | null;
  doNotDisturb?: boolean | null;
  hasPhone?: boolean;
}): ContactBlock | null {
  if (input.muted) return "muted";
  if (input.doNotDisturb) return "do_not_disturb";
  if (input.hasPhone === false) return "no_phone";
  return null;
}

export const CONTACT_BLOCK_MESSAGE: Record<ContactBlock, string> = {
  muted: "Vendedor mutado. Nenhum canal de saída.",
  do_not_disturb: "Não perturbe. Nenhum canal de saída.",
  no_phone: "Sem telefone coletado neste anúncio.",
};

/** Só dígitos, com 55 se vier número nacional de 10–11 dígitos. */
export function phoneDigitsForWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 12) return digits;
  if (digits.length >= 10 && !digits.startsWith("55")) return `55${digits}`;
  return digits;
}

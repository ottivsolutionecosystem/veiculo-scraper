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

/** E.164 em formato de ler: +5511999998888 vira (11) 99999-8888. */
export function formatPhoneBR(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  if (national.length === 11) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  }
  if (national.length === 10) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  }
  return phone;
}

export function phoneDigitsForWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 12) return digits;
  if (digits.length >= 10 && !digits.startsWith("55")) return `55${digits}`;
  return digits;
}

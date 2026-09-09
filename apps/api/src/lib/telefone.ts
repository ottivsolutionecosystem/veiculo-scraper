/**
 * Telefone do vendedor: normalização para E.164 e hash de dedupe.
 *
 * O hash é a chave que liga um telefone a um vendedor sem guardar o número
 * em claro (`vendedores.telefone_hash`, único). Convenção: sha256 do E.164
 * completo, com o "+". Quem gravar telefone em qualquer lugar do projeto usa
 * este módulo — se o coletor um dia passar a escrever vendedor, tem que
 * produzir exatamente este hash ou o dedupe quebra em silêncio.
 */
import { createHash } from "node:crypto";

/**
 * Quanto tempo o telefone anotado à mão fica guardado. Prazo longo porque a
 * relação com o vendedor consignado dura, mas ainda assim finito: o job de
 * TTL varre `contatos_vendedor` e apaga o que venceu.
 */
export const MANUAL_CONTACT_TTL_DAYS = 730;

/**
 * Aceita o que o consignador digita (com máscara, com +55, com 0 na frente)
 * e devolve E.164. Null quando não dá para confiar no número.
 */
export function normalizePhoneBR(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  // O 0 de operadora vem antes do +55 quando aparece: 0 55 11 9..., 0 11 9...
  if (digits.length > 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);

  if (digits.length !== 10 && digits.length !== 11) return null;
  // Celular no Brasil tem 11 dígitos e o nono é sempre 9.
  if (digits.length === 11 && digits[2] !== "9") return null;

  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;

  return `+55${digits}`;
}

export function phoneHash(e164: string): string {
  return createHash("sha256").update(e164).digest("hex");
}

export function manualContactExpiry(now = new Date()): Date {
  return new Date(now.getTime() + MANUAL_CONTACT_TTL_DAYS * 24 * 60 * 60 * 1000);
}

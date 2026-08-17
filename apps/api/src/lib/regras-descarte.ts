/**
 * Regras de descarte (SPEC seção 7.2): todo descarte exige motivo; descarte
 * com gatilho de retorno volta pra fila quando a condição bate (queda de
 * preço ou tempo parado). "Nada é apagado" — isso decide *reaparecer*,
 * nunca decide deletar.
 */

export interface DiscardTrigger {
  kind: "price_drop" | "days_elapsed";
  value: number; // % (price_drop) ou dias (days_elapsed)
}

export interface DiscardTriggerContext {
  priceAtDiscardCents: number;
  currentPriceCents: number;
  discardedAt: Date;
  now: Date;
}

export function assertHasDiscardReason(reason: string | null | undefined): asserts reason is string {
  if (!reason || reason.trim().length === 0) {
    throw new Error("Todo descarte exige motivo (seção 7.2 do SPEC).");
  }
}

/** `null` de gatilho = descarte permanente, nunca volta sozinho. */
export function shouldReturnFromDiscard(
  trigger: DiscardTrigger | null,
  context: DiscardTriggerContext,
): boolean {
  if (!trigger) return false;

  if (trigger.kind === "price_drop") {
    if (context.priceAtDiscardCents <= 0) return false;
    const dropPct =
      ((context.priceAtDiscardCents - context.currentPriceCents) / context.priceAtDiscardCents) * 100;
    return dropPct >= trigger.value;
  }

  const daysElapsed = Math.floor(
    (context.now.getTime() - context.discardedAt.getTime()) / (24 * 60 * 60 * 1000),
  );
  return daysElapsed >= trigger.value;
}

"use client";

import { CreditCard } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

/** Cartas contempladas — API externa ainda pendente. */
export function LettersBoard() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-navy">Cartas contempladas</h2>
        <p className="text-sm text-muted-foreground">
          Espaço reservado. A sincronização via API ainda não foi definida.
        </p>
      </div>
      <EmptyState
        icon={CreditCard}
        title="API de cartas pendente"
        description="Quando o provedor estiver escolhido, esta tela lista crédito, parcela, grupo e status."
      />
    </div>
  );
}

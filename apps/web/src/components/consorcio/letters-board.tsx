"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

/** Cartas contempladas — API externa ainda pendente. */
export function LettersBoard() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-navy">Cartas contempladas</h2>
          <p className="text-sm text-muted-foreground">
            Espaço reservado. A sincronização via API ainda não foi definida.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/consorcio/oferecimentos">Oferecimentos</Link>
        </Button>
      </div>
      <EmptyState
        icon={CreditCard}
        title="API de cartas pendente"
        description="Quando o provedor estiver escolhido, esta tela lista crédito, parcela, grupo e status."
      />
    </div>
  );
}

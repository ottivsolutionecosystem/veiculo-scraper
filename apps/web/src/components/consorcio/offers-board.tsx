"use client";

import * as React from "react";
import Link from "next/link";
import { Handshake, Plus } from "lucide-react";

import type { ConsorcioOffer } from "@veiculo/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCents, formatDateTime } from "@/lib/format";
import { OFFER_STATUS_LABEL } from "@/lib/consorcio/labels";
import { listOffers } from "@/lib/consorcio/store";

export function OffersBoard() {
  const [items, setItems] = React.useState<ConsorcioOffer[] | null>(null);

  React.useEffect(() => {
    setItems(listOffers());
  }, []);

  if (!items) return null;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-navy">Oferecimentos</h2>
          <p className="text-sm text-muted-foreground">
            Vistoria remota + FIPE + lance. Depois libera na vitrine do lojista.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/consorcio/vitrine">Vitrine do lojista</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/consorcio/cartas">Cartas</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/consorcio/oferecimentos/novo">
              <Plus className="h-4 w-4" /> Novo
            </Link>
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Nenhum oferecimento"
          description="Crie um oferecimento, peça as fotos (ou use o link público) e liberte na vitrine."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((o) => (
            <Link key={o.id} href={`/consorcio/oferecimentos/${o.id}`} className="block">
              <Card className="card-lift h-full">
                <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate font-mono tracking-wide">
                      {o.plate || "Sem placa"}
                    </CardTitle>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.fipe ? `${o.fipe.brand} ${o.fipe.model}` : "FIPE pendente"}
                    </p>
                  </div>
                  <Badge variant="outline">{OFFER_STATUS_LABEL[o.status]}</Badge>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-muted-foreground">
                  <p>Lance: {formatCents(o.bidCents)}</p>
                  <p>FIPE: {formatCents(o.fipe?.priceCents ?? null)}</p>
                  <p>Atualizado {formatDateTime(o.updatedAt)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

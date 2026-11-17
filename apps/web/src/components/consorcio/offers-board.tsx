"use client";

import * as React from "react";
import Link from "next/link";
import { Handshake, Loader2, Plus } from "lucide-react";

import type { ConsorcioOffer } from "@veiculo/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ApiError } from "@/lib/api";
import { formatCents, formatDateTime } from "@/lib/format";
import { listConsorcioOffers } from "@/lib/consorcio/api";
import { OFFER_STATUS_LABEL } from "@/lib/consorcio/labels";

export function OffersBoard() {
  const [items, setItems] = React.useState<ConsorcioOffer[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void listConsorcioOffers()
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setItems([]);
          setError(err instanceof ApiError ? err.message : "Não carregou os oferecimentos.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-navy">Oferecimentos</h2>
          <p className="text-sm text-muted-foreground">
            Crie o link e mande pro cliente completar a avaliação (placa, FIPE, fotos, lance).
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {items.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Nenhum oferecimento"
          description="Crie um oferecimento e compartilhe o link completo com o cliente."
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
                      {o.fipe ? `${o.fipe.brand} ${o.fipe.model}` : "Aguardando avaliação"}
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

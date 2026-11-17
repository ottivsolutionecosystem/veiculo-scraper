"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import type { ConsorcioOffer } from "@veiculo/types";
import { OfferForm } from "@/components/consorcio/offer-form";
import { ApiError } from "@/lib/api";
import { getConsorcioOffer } from "@/lib/consorcio/api";

export default function OferecimentoDetailPage() {
  const params = useParams<{ id: string }>();
  const [offer, setOffer] = React.useState<ConsorcioOffer | null | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void getConsorcioOffer(params.id)
      .then((o) => {
        if (!cancelled) setOffer(o);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setOffer(null);
          setError(err instanceof ApiError ? err.message : "Não carregou.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (offer === undefined) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }
  if (!offer) return <p className="p-6 text-sm text-destructive">{error ?? "Não encontrado."}</p>;
  return <OfferForm initial={offer} />;
}

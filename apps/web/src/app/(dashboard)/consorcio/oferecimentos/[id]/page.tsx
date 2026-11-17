"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { OfferForm } from "@/components/consorcio/offer-form";
import { getOffer } from "@/lib/consorcio/store";

export default function OferecimentoDetailPage() {
  const params = useParams<{ id: string }>();
  const [ready, setReady] = React.useState(false);
  const offer = React.useMemo(() => (ready ? getOffer(params.id) : null), [params.id, ready]);

  React.useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;
  if (!offer) return <p className="p-6 text-sm text-destructive">Oferecimento não encontrado.</p>;
  return <OfferForm initial={offer} />;
}

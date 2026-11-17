"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ConsorcioOffer } from "@veiculo/types";
import { OfferEditor } from "@/components/consorcio/offer-editor";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { listConsorcioOffer, patchConsorcioOffer } from "@/lib/consorcio/api";

export function OfferForm({ initial }: { initial: ConsorcioOffer }) {
  const router = useRouter();
  const [offer, setOffer] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/o/${offer.publicToken}`
      : `/o/${offer.publicToken}`;

  async function persist(patch: Partial<ConsorcioOffer>) {
    try {
      const next = await patchConsorcioOffer(offer.id, patch);
      setOffer(next);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não salvou.");
    }
  }

  async function publish() {
    setBusy(true);
    try {
      const next = await listConsorcioOffer(offer.id);
      setOffer(next);
      router.push("/consorcio/vitrine");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não liberou na vitrine.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-navy">Oferecimento</h2>
          <p className="text-sm text-muted-foreground">
            Preencha aqui ou mande o link pro cliente fazer a avaliação completa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/consorcio/vitrine">Vitrine</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/consorcio/oferecimentos">Voltar</Link>
          </Button>
        </div>
      </div>

      <OfferEditor
        offer={offer}
        mode="internal"
        busy={busy}
        publicUrl={publicUrl}
        onChange={setOffer}
        onPersist={persist}
        onPublish={publish}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

"use client";

import * as React from "react";
import { ClipboardCheck } from "lucide-react";

import type { ConsorcioOffer } from "@veiculo/types";
import { AuttusWordmark } from "@/components/brand/auttus-mark";
import { OfferEditor } from "@/components/consorcio/offer-editor";
import { ApiError } from "@/lib/api";
import { getPublicConsorcioOffer, patchPublicConsorcioOffer } from "@/lib/consorcio/api";
import { canListOffer } from "@/lib/consorcio/offer-rules";

export function PublicUpload({ token }: { token: string }) {
  const [offer, setOffer] = React.useState<ConsorcioOffer | null | undefined>(undefined);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void getPublicConsorcioOffer(token)
      .then((o) => {
        if (!cancelled) {
          setOffer(o);
          if (canListOffer(o) && (o.status === "ready" || o.status === "listed" || o.status === "proposed")) {
            setDone(true);
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setOffer(null);
          setError(err instanceof ApiError ? err.message : "Link inválido.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (offer === undefined) {
    return <p className="p-6 text-sm text-muted-foreground">Carregando avaliação…</p>;
  }

  if (!offer) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6 text-center">
        <AuttusWordmark onDark={false} align="center" />
        <p className="text-sm text-destructive">{error ?? "Link inválido ou expirado."}</p>
      </div>
    );
  }

  async function persist(patch: Partial<ConsorcioOffer>) {
    try {
      const next = await patchPublicConsorcioOffer(token, patch);
      setOffer(next);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não salvou.");
    }
  }

  async function submit() {
    if (!offer) return;
    const snapshot = offer;
    setBusy(true);
    try {
      const next = await patchPublicConsorcioOffer(token, {
        plate: snapshot.plate,
        fipe: snapshot.fipe,
        bidCents: snapshot.bidCents,
        tires: snapshot.tires,
        photos: snapshot.photos,
        ownerName: snapshot.ownerName,
        ownerPhone: snapshot.ownerPhone,
        notes: snapshot.notes,
        km: snapshot.km,
        brand: snapshot.brand,
        model: snapshot.model,
        modelYear: snapshot.modelYear,
      });
      setOffer(next);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não enviou.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-2xl space-y-4 bg-[hsl(var(--background))] p-4 pb-10 sm:p-6">
      <div className="space-y-1">
        <AuttusWordmark onDark={false} align="left" />
        <h1 className="flex items-center gap-2 text-lg font-semibold text-navy">
          <ClipboardCheck className="h-5 w-5" /> Avaliação do veículo
        </h1>
        <p className="text-sm text-muted-foreground">
          Preencha placa, FIPE, lance, pneus e as fotos. Quando terminar, toque em
          “Enviar avaliação completa”.
        </p>
      </div>

      {done ? (
        <div className="rounded-2xl border border-boa/30 bg-boa/10 px-4 py-6 text-sm text-navy">
          Avaliação recebida. Obrigado — o consignador já pode analisar e liberar na vitrine.
        </div>
      ) : (
        <OfferEditor
          offer={offer}
          mode="public"
          busy={busy}
          onChange={setOffer}
          onPersist={persist}
          onSubmitPublic={submit}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

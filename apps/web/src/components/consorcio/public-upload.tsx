"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import type { ConsorcioOffer } from "@veiculo/types";
import { OfferEditor, PublicSubmitBar } from "@/components/consorcio/offer-editor";
import { PublicProgress } from "@/components/consorcio/public-progress";
import { PublicShell } from "@/components/consorcio/public-shell";
import { ApiError } from "@/lib/api";
import { getPublicConsorcioOffer, patchPublicConsorcioOffer } from "@/lib/consorcio/api";
import { canListOffer } from "@/lib/consorcio/offer-rules";

export function PublicUpload({ token }: { token: string }) {
  const [offer, setOffer] = React.useState<ConsorcioOffer | null | undefined>(undefined);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void getPublicConsorcioOffer(token)
      .then((o) => {
        if (!cancelled) {
          setOffer(o);
          if (
            canListOffer(o) &&
            (o.status === "ready" || o.status === "listed" || o.status === "proposed")
          ) {
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
    return (
      <PublicShell title="Carregando avaliação…" subtitle="Um instante.">
        <div className="flex items-center justify-center gap-2 rounded-[1.25rem] border border-white/10 bg-white/[0.07] px-4 py-16 text-sm text-white/70 backdrop-blur-xl">
          <Loader2 className="h-4 w-4 animate-spin text-coral" /> Abrindo seu link…
        </div>
      </PublicShell>
    );
  }

  if (!offer) {
    return (
      <PublicShell
        eyebrow="Link indisponível"
        title="Não encontramos esta avaliação"
        subtitle={error ?? "O link pode ter expirado. Peça um novo ao consignador."}
      >
        <div className="rounded-[1.25rem] border border-destructive/40 bg-destructive/15 px-5 py-6 text-sm text-white/85 backdrop-blur-xl">
          {error ?? "Link inválido ou expirado."}
        </div>
      </PublicShell>
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
    if (!canListOffer(offer)) {
      setFeedback("Complete todos os passos do progresso antes de enviar.");
      return;
    }
    const snapshot = offer;
    setBusy(true);
    setFeedback(null);
    try {
      const next = await patchPublicConsorcioOffer(token, {
        plate: snapshot.plate,
        fipe: snapshot.fipe,
        bidCents: snapshot.bidCents,
        financed: snapshot.financed,
        payoffCents: snapshot.payoffCents,
        hasDamage: snapshot.hasDamage,
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

  if (done) {
    return (
      <PublicShell
        eyebrow="Pronto"
        title="Avaliação recebida"
        subtitle="Obrigado. O consignador já pode analisar e liberar na vitrine do lojista."
      >
        <div className="flex flex-col items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.07] px-6 py-12 text-center backdrop-blur-xl">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-boa/20 text-boa">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-white">Tudo certo</p>
            <p className="max-w-sm text-sm leading-relaxed text-white/55">
              Você já pode fechar esta página. Se precisar corrigir algo, peça um novo link ao
              consignador.
            </p>
          </div>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell
      title="Conte sobre o seu carro"
      subtitle="Leva poucos minutos: placa, FIPE, lance, financiamento, pneus, fotos e avarias. Salvamos conforme você preenche."
    >
      <div className="space-y-4 pb-28">
        <PublicProgress offer={offer} />

        <div className="rounded-[1.5rem] border border-white/10 bg-[hsl(var(--background))] p-3 shadow-[0_40px_80px_-28px_rgba(0,0,0,0.55)] sm:p-5">
          <OfferEditor
            offer={offer}
            mode="public"
            busy={busy}
            hideActions
            onChange={setOffer}
            onPersist={persist}
            onSubmitPublic={submit}
            onMessage={setFeedback}
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/15 px-3 py-2 text-sm text-white">
            {error}
          </p>
        ) : null}
      </div>

      <PublicSubmitBar
        ready={canListOffer(offer)}
        busy={busy}
        onSubmit={() => void submit()}
        message={feedback}
      />
    </PublicShell>
  );
}

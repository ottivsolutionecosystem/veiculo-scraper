"use client";

import * as React from "react";
import { Check, Copy, Loader2, Send, Store } from "lucide-react";

import type { ConsorcioOffer } from "@veiculo/types";
import { FipeCascade } from "@/components/consorcio/fipe-cascade";
import { PhotoSlots } from "@/components/consorcio/photo-slots";
import { TireFields } from "@/components/consorcio/tire-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { formatCents } from "@/lib/format";
import { lookupFipeByPlate, type PlateFipeCandidate } from "@/lib/consorcio/fipe-client";
import { canListOffer, missingRequiredPhotos } from "@/lib/consorcio/offer-rules";
import { formatPlate, isValidPlate, normalizePlate } from "@/lib/consorcio/plate";
import { REQUIRED_PHOTO_LABEL } from "@/lib/consorcio/labels";
import { cn } from "@/lib/utils";

function parseMoneyToCents(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number.parseInt(digits, 10) * 100;
}

function Section({
  title,
  hint,
  children,
  publicMode,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  publicMode: boolean;
}) {
  if (!publicMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          {children}
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-navy/[0.08] bg-card shadow-card">
      <div className="space-y-1 border-b border-navy/[0.06] px-5 py-4">
        <div className="accent-rule mb-2 max-w-[4.5rem]" />
        <h2 className="text-base font-semibold tracking-tight text-navy">{title}</h2>
        {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="space-y-3 px-5 py-4">{children}</div>
    </section>
  );
}

export function OfferEditor({
  offer,
  mode,
  busy = false,
  hideActions = false,
  onChange,
  onPersist,
  onPublish,
  onSubmitPublic,
  publicUrl,
  onMessage,
}: {
  offer: ConsorcioOffer;
  mode: "internal" | "public";
  busy?: boolean;
  hideActions?: boolean;
  onChange: (next: ConsorcioOffer) => void;
  onPersist: (patch: Partial<ConsorcioOffer>) => Promise<void> | void;
  onPublish?: () => Promise<void> | void;
  onSubmitPublic?: () => Promise<void> | void;
  publicUrl?: string;
  onMessage?: (msg: string | null) => void;
}) {
  const publicMode = mode === "public";
  const [bidText, setBidText] = React.useState(
    offer.bidCents !== null ? String(Math.round(offer.bidCents / 100)) : "",
  );
  const [payoffText, setPayoffText] = React.useState(
    offer.payoffCents !== null ? String(Math.round(offer.payoffCents / 100)) : "",
  );
  const [copied, setCopied] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [plateCandidates, setPlateCandidates] = React.useState<PlateFipeCandidate[] | null>(null);
  const [plateLookupBusy, setPlateLookupBusy] = React.useState(false);
  const [plateLookupError, setPlateLookupError] = React.useState<string | null>(null);
  const lastLookedUpPlate = React.useRef<string | null>(null);

  React.useEffect(() => {
    setBidText(offer.bidCents !== null ? String(Math.round(offer.bidCents / 100)) : "");
  }, [offer.id, offer.bidCents]);

  React.useEffect(() => {
    setPayoffText(offer.payoffCents !== null ? String(Math.round(offer.payoffCents / 100)) : "");
  }, [offer.id, offer.payoffCents]);

  function setFeedback(next: string | null) {
    setMsg(next);
    onMessage?.(next);
  }

  async function persist(patch: Partial<ConsorcioOffer>) {
    setFeedback(null);
    await onPersist(patch);
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback("Não copiou — copie o link manualmente.");
    }
  }

  function incompleteMessage() {
    return [
      !offer.plate || !isValidPlate(offer.plate) ? "placa válida" : null,
      !offer.fipe ? "FIPE" : null,
      !offer.bidCents ? "lance" : null,
      offer.financed === null
        ? "dizer se está financiado"
        : offer.financed && !offer.payoffCents
          ? "valor da quitação"
          : null,
      offer.tires.frontLeft === "unknown" ||
      offer.tires.frontRight === "unknown" ||
      offer.tires.rearLeft === "unknown" ||
      offer.tires.rearRight === "unknown"
        ? "estado dos pneus"
        : null,
      offer.hasDamage === null
        ? "dizer se há avaria"
        : offer.hasDamage && !offer.photos.some((p) => p.slot === "damage")
          ? "foto da avaria"
          : null,
      ...missingRequiredPhotos(offer).map((s) => `foto ${REQUIRED_PHOTO_LABEL[s]}`),
    ]
      .filter(Boolean)
      .join(", ");
  }

  async function handlePublish() {
    if (!canListOffer(offer)) {
      setFeedback(`Falta: ${incompleteMessage()}`);
      return;
    }
    await onPublish?.();
  }

  async function handleSubmitPublic() {
    if (!canListOffer(offer)) {
      setFeedback(`Complete antes de enviar: ${incompleteMessage()}`);
      return;
    }
    await onSubmitPublic?.();
    setFeedback("Avaliação enviada. O consignador já consegue ver tudo.");
  }

  const readOnlyListed =
    offer.status === "listed" || offer.status === "proposed" || offer.status === "closed";

  React.useEffect(() => {
    if (!isValidPlate(offer.plate) || (readOnlyListed && publicMode)) {
      if (!isValidPlate(offer.plate)) lastLookedUpPlate.current = null;
      setPlateCandidates(null);
      setPlateLookupError(null);
      setPlateLookupBusy(false);
      return;
    }
    const plate = normalizePlate(offer.plate);
    if (lastLookedUpPlate.current === plate) return;
    // Já tinha FIPE ao abrir o formulário — não cobra de novo.
    if (offer.fipe && lastLookedUpPlate.current === null) {
      lastLookedUpPlate.current = plate;
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setPlateLookupBusy(true);
      setPlateLookupError(null);
      void lookupFipeByPlate(plate)
        .then((res) => {
          if (cancelled) return;
          lastLookedUpPlate.current = plate;
          setPlateCandidates(res.candidates);
          const principal = res.candidates.find((c) => c.principal) ?? res.candidates[0];
          if (!principal) return;
          const { principal: _p, ...fipe } = principal;
          const patch: Partial<ConsorcioOffer> = {
            fipe,
            brand: fipe.brand,
            model: fipe.model,
            modelYear: fipe.modelYear,
            color: res.color ?? offer.color,
          };
          onChange({ ...offer, ...patch });
          void persist(patch);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setPlateCandidates(null);
          if (err instanceof ApiError && /não configurada/i.test(err.message)) {
            setPlateLookupError(null);
            return;
          }
          setPlateLookupError(
            err instanceof Error ? err.message : "Não consultou a FIPE pela placa.",
          );
        })
        .finally(() => {
          if (!cancelled) setPlateLookupBusy(false);
        });
    }, 650);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à placa válida
  }, [offer.plate, offer.id, publicMode, readOnlyListed]);

  return (
    <div className={cn("space-y-4", publicMode && "pb-28")}>
      <Section
        publicMode={publicMode}
        title="Placa e contato"
        hint="Use a placa do documento. O km deve aparecer no velocímetro com o carro ligado."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Placa</Label>
            <Input
              value={formatPlate(offer.plate)}
              disabled={readOnlyListed && publicMode}
              onChange={(e) => {
                const plate = normalizePlate(e.target.value);
                onChange({ ...offer, plate });
                void persist({ plate });
              }}
              placeholder="ABC1D23"
              className="font-mono uppercase tracking-wider"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Km (do velocímetro)</Label>
            <Input
              type="number"
              value={offer.km ?? ""}
              onChange={(e) => {
                const km = e.target.value ? Number.parseInt(e.target.value, 10) : null;
                onChange({ ...offer, km });
                void persist({ km });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{publicMode ? "Seu nome" : "Nome do dono"}</Label>
            <Input
              value={offer.ownerName ?? ""}
              onChange={(e) => {
                const ownerName = e.target.value || null;
                onChange({ ...offer, ownerName });
                void persist({ ownerName });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone / WhatsApp</Label>
            <Input
              value={offer.ownerPhone ?? ""}
              onChange={(e) => {
                const ownerPhone = e.target.value || null;
                onChange({ ...offer, ownerPhone });
                void persist({ ownerPhone });
              }}
            />
          </div>
        </div>
      </Section>

      <Section
        publicMode={publicMode}
        title="FIPE do veículo"
        hint="Com a placa válida preenchemos sozinho. Se não bater, escolha a versão no documento."
      >
        <FipeCascade
          value={offer.fipe}
          plateCandidates={plateCandidates}
          plateLookupBusy={plateLookupBusy}
          plateLookupError={plateLookupError}
          onChange={(fipe) => {
            const patch = {
              fipe,
              brand: fipe?.brand ?? null,
              model: fipe?.model ?? null,
              modelYear: fipe?.modelYear ?? null,
            };
            onChange({ ...offer, ...patch });
            void persist(patch);
          }}
        />
      </Section>

      <Section
        publicMode={publicMode}
        title="Lance"
        hint="Quanto você precisa receber neste oferecimento."
      >
        <div className="space-y-1.5">
          <Label>Valor do lance (R$)</Label>
          <Input
            inputMode="numeric"
            value={bidText}
            onChange={(e) => {
              setBidText(e.target.value);
              const bidCents = parseMoneyToCents(e.target.value);
              onChange({ ...offer, bidCents });
              void persist({ bidCents });
            }}
            placeholder="45000"
          />
          <p className="text-xs text-muted-foreground">
            Gravado: {formatCents(offer.bidCents)}
            {offer.fipe && offer.bidCents !== null
              ? ` · ${(((offer.fipe.priceCents - offer.bidCents) / offer.fipe.priceCents) * 100).toFixed(1)}% vs FIPE`
              : ""}
          </p>
        </div>
      </Section>

      <Section
        publicMode={publicMode}
        title="Financiamento"
        hint="Se o carro ainda tem financiamento, informe o valor pra quitar. Se estiver quitado, marque Não."
      >
        <div className="space-y-3">
          <p className="text-sm font-medium text-navy">O veículo está financiado?</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={offer.financed === true ? "default" : "outline"}
              className="h-11 rounded-xl"
              onClick={() => {
                onChange({ ...offer, financed: true });
                void persist({ financed: true });
              }}
            >
              Sim, está financiado
            </Button>
            <Button
              type="button"
              variant={offer.financed === false ? "default" : "outline"}
              className="h-11 rounded-xl"
              onClick={() => {
                setPayoffText("");
                onChange({ ...offer, financed: false, payoffCents: null });
                void persist({ financed: false, payoffCents: null });
              }}
            >
              Não, está quitado
            </Button>
          </div>

          {offer.financed === null ? (
            <p className="rounded-xl border border-dashed border-orange/35 bg-orange/[0.07] px-3 py-2 text-xs font-medium text-navy">
              Responda Sim ou Não — o lojista precisa saber se há saldo a quitar.
            </p>
          ) : null}

          {offer.financed === true ? (
            <div className="space-y-1.5 rounded-2xl border border-coral/30 bg-coral/[0.05] p-3">
              <Label>Valor da quitação (R$)</Label>
              <Input
                inputMode="numeric"
                value={payoffText}
                onChange={(e) => {
                  setPayoffText(e.target.value);
                  const payoffCents = parseMoneyToCents(e.target.value);
                  onChange({ ...offer, financed: true, payoffCents });
                  void persist({ financed: true, payoffCents });
                }}
                placeholder="18500"
              />
              <p className="text-xs text-muted-foreground">
                Quanto falta pra quitar o financiamento. Gravado: {formatCents(offer.payoffCents)}
              </p>
            </div>
          ) : null}

          {offer.financed === false ? (
            <p className="text-xs text-muted-foreground">
              Declarado: veículo sem financiamento ativo.
            </p>
          ) : null}
        </div>
      </Section>

      <Section publicMode={publicMode} title="Estado dos pneus">
        <TireFields
          value={offer.tires}
          onChange={(tires) => {
            onChange({ ...offer, tires });
            void persist({ tires });
          }}
        />
      </Section>

      <Section
        publicMode={publicMode}
        title="Fotos do veículo"
        hint="Obrigatórias: frente, traseira, laterais, painel e velocímetro ligado. Em seguida, diga se há batida, arranhão ou detalhe de pintura."
      >
        {mode === "internal" && publicUrl && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-navy/15 bg-navy/[0.02] px-3 py-2 text-xs">
            <span className="text-muted-foreground">Link completo pro cliente:</span>
            <code className="truncate font-mono text-[11px] text-navy">{publicUrl}</code>
            <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        )}
        <PhotoSlots
          offer={offer}
          onChange={(next) => {
            onChange(next);
            void persist({ photos: next.photos, hasDamage: next.hasDamage });
          }}
        />
      </Section>

      <Section publicMode={publicMode} title="Observações" hint="Opcional.">
        <Textarea
          value={offer.notes ?? ""}
          onChange={(e) => {
            const notes = e.target.value || null;
            onChange({ ...offer, notes });
            void persist({ notes });
          }}
          rows={3}
          placeholder="Algo que o lojista precise saber"
        />
      </Section>

      {!hideActions && (
        <div className="flex flex-wrap gap-2">
          {mode === "internal" && (
            <Button type="button" disabled={busy} onClick={() => void handlePublish()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
              Liberar na vitrine
            </Button>
          )}
          {mode === "public" && (
            <Button type="button" disabled={busy} onClick={() => void handleSubmitPublic()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar avaliação completa
            </Button>
          )}
        </div>
      )}
      {msg && !onMessage && <p className="text-sm text-navy">{msg}</p>}
    </div>
  );
}

export function PublicSubmitBar({
  ready,
  busy,
  onSubmit,
  message,
}: {
  ready: boolean;
  busy: boolean;
  onSubmit: () => void;
  message?: string | null;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-deep/95 px-4 py-3 backdrop-blur-xl">
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-2"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {message ? <p className="text-center text-xs text-coral">{message}</p> : null}
        <Button
          type="button"
          size="lg"
          className="h-12 w-full rounded-xl text-base"
          disabled={busy || !ready}
          onClick={onSubmit}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {ready ? "Enviar avaliação completa" : "Complete os passos acima"}
        </Button>
      </div>
    </div>
  );
}

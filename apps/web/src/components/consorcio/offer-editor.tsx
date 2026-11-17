"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, Loader2, Search, Send, Share2, Store } from "lucide-react";

import type { ConsorcioOffer } from "@veiculo/types";
import { FipeCascade } from "@/components/consorcio/fipe-cascade";
import { PhotoSlots } from "@/components/consorcio/photo-slots";
import { TireFields } from "@/components/consorcio/tire-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { formatCents } from "@/lib/format";
import { lookupFipeByPlate, type PlateFipeCandidate } from "@/lib/consorcio/fipe-client";
import { canListOffer, missingRequiredPhotos } from "@/lib/consorcio/offer-rules";
import { formatPlate, isValidPlate, normalizePlate } from "@/lib/consorcio/plate";
import { REQUIRED_PHOTO_LABEL } from "@/lib/consorcio/labels";
import { AVALIACAO_TERMS_PATH } from "@/lib/consorcio/terms";
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
  const [plateColor, setPlateColor] = React.useState<string | null>(null);

  React.useEffect(() => {
    setBidText(offer.bidCents !== null ? String(Math.round(offer.bidCents / 100)) : "");
  }, [offer.id, offer.bidCents]);

  React.useEffect(() => {
    setPayoffText(offer.payoffCents !== null ? String(Math.round(offer.payoffCents / 100)) : "");
  }, [offer.id, offer.payoffCents]);

  React.useEffect(() => {
    setPlateCandidates(null);
    setPlateLookupError(null);
    setPlateColor(null);
  }, [offer.id]);

  function setFeedback(next: string | null) {
    setMsg(next);
    onMessage?.(next);
  }

  async function persist(patch: Partial<ConsorcioOffer>) {
    setFeedback(null);
    await onPersist(patch);
  }

  async function handleConsultPlate() {
    if (!isValidPlate(offer.plate)) {
      setPlateLookupError("Informe uma placa válida antes de consultar.");
      return;
    }
    const plate = normalizePlate(offer.plate);
    setPlateLookupBusy(true);
    setPlateLookupError(null);
    setPlateCandidates(null);
    try {
      const res = await lookupFipeByPlate(plate);
      setPlateCandidates(res.candidates);
      setPlateColor(res.color);
      if (res.color && res.color !== offer.color) {
        onChange({ ...offer, color: res.color });
        void persist({ color: res.color });
      }
    } catch (err: unknown) {
      setPlateCandidates(null);
      if (err instanceof ApiError && /não configurada/i.test(err.message)) {
        setPlateLookupError("Consulta por placa indisponível no momento. Tente de novo em instantes.");
        return;
      }
      setPlateLookupError(
        err instanceof Error ? err.message : "Não consultou o veículo pela placa.",
      );
    } finally {
      setPlateLookupBusy(false);
    }
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

  async function shareLink() {
    if (!publicUrl) return;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Avaliação do veículo",
          text: "Preencha a avaliação completa do veículo neste link:",
          url: publicUrl,
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await copyLink();
    setFeedback("Link copiado — cole no WhatsApp ou no e-mail.");
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
  const plateLocked = readOnlyListed && publicMode;
  const canConsult = isValidPlate(offer.plate) && !plateLocked && !plateLookupBusy;

  return (
    <div className={cn("space-y-4", publicMode && "pb-28")}>
      {mode === "internal" && publicUrl ? (
        <Section
          publicMode={false}
          title="Link pro cliente"
          hint="Envie este link para o dono do carro preencher a avaliação completa."
        >
          <div className="space-y-3">
            <code className="block break-all rounded-xl border border-navy/10 bg-navy/[0.03] px-3 py-2.5 font-mono text-xs text-navy">
              {publicUrl}
            </code>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void copyLink()}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar link"}
              </Button>
              <Button type="button" onClick={() => void shareLink()}>
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </div>
        </Section>
      ) : null}

      <Section
        publicMode={publicMode}
        title="Placa e contato"
        hint="Digite a placa e toque em Consultar veículo. O km aparece na foto do painel com o carro ligado."
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Placa</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={formatPlate(offer.plate)}
                disabled={plateLocked}
                onChange={(e) => {
                  const plate = normalizePlate(e.target.value);
                  setPlateCandidates(null);
                  setPlateLookupError(null);
                  setPlateColor(null);
                  const cleared =
                    offer.fipe || offer.brand || offer.model || offer.modelYear
                      ? {
                          plate,
                          fipe: null,
                          brand: null,
                          model: null,
                          modelYear: null,
                        }
                      : { plate };
                  onChange({ ...offer, ...cleared });
                  void persist(cleared);
                }}
                placeholder="ABC1D23"
                className="font-mono uppercase tracking-wider sm:flex-1"
              />
              <Button
                type="button"
                className="h-10 shrink-0 rounded-xl sm:min-w-[11rem]"
                disabled={!canConsult}
                onClick={() => void handleConsultPlate()}
              >
                {plateLookupBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Consultar veículo
              </Button>
            </div>
            {plateColor ? (
              <p className="text-xs text-muted-foreground">Cor na consulta: {plateColor}</p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
      </Section>

      <Section
        publicMode={publicMode}
        title="Versão FIPE"
        hint="Só pela placa: consulte o veículo e escolha a versão que bate com o documento."
      >
        <FipeCascade
          value={offer.fipe}
          plateCandidates={plateCandidates}
          plateLookupBusy={plateLookupBusy}
          plateLookupError={plateLookupError}
          hasValidPlate={isValidPlate(offer.plate)}
          onChange={(fipe) => {
            const patch = {
              fipe,
              brand: fipe?.brand ?? null,
              model: fipe?.model ?? null,
              modelYear: fipe?.modelYear ?? null,
              color: plateColor ?? offer.color,
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

      <Section
        publicMode={publicMode}
        title="Estado dos pneus"
        hint="Olhe o carro de cima: toque Bom, Médio ou Ruim em cada canto. Use o atalho se todos estiverem iguais."
      >
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
  termsAccepted,
  onTermsAcceptedChange,
}: {
  ready: boolean;
  busy: boolean;
  onSubmit: () => void;
  message?: string | null;
  termsAccepted: boolean;
  onTermsAcceptedChange: (next: boolean) => void;
}) {
  const canSend = ready && termsAccepted;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-deep/95 px-4 py-3 backdrop-blur-xl">
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-3"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
          <Checkbox
            checked={termsAccepted}
            onCheckedChange={(v) => onTermsAcceptedChange(v === true)}
            className="mt-0.5 border-white/40 data-[state=checked]:border-coral data-[state=checked]:bg-coral"
            aria-describedby="termos-avaliacao-desc"
          />
          <span id="termos-avaliacao-desc" className="text-xs leading-relaxed text-white/75">
            Declaro que todas as informações são verdadeiras e completas. Li e aceito os{" "}
            <Link
              href={AVALIACAO_TERMS_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-coral underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              termos
            </Link>
            .
          </span>
        </label>
        {message ? <p className="text-center text-xs text-coral">{message}</p> : null}
        <Button
          type="button"
          size="lg"
          className="h-12 w-full rounded-xl text-base"
          disabled={busy || !canSend}
          onClick={onSubmit}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {!ready
            ? "Complete os passos acima"
            : !termsAccepted
              ? "Aceite os termos para enviar"
              : "Enviar avaliação completa"}
        </Button>
      </div>
    </div>
  );
}

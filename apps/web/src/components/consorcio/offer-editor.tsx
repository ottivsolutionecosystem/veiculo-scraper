"use client";

import * as React from "react";
import { Check, Copy, Loader2, Search, Send, Share2, Store } from "lucide-react";

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

/** Campo de texto local — tipa à vontade; grava no blur / debounce sem brigar com a API. */
function SoftTextField({
  id,
  label,
  value,
  disabled,
  placeholder,
  inputMode,
  autoComplete,
  className,
  onCommit,
}: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  className?: string;
  onCommit: (next: string) => void;
}) {
  const [text, setText] = React.useState(value);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = React.useRef(value);

  React.useEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      setText(value);
    }
  }, [value]);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function flush(next: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    if (next !== valueRef.current) {
      valueRef.current = next;
      onCommit(next);
    }
  }

  function schedule(next: string) {
    setText(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => flush(next), 450);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className={className}
        onChange={(e) => schedule(e.target.value)}
        onBlur={() => flush(text)}
      />
    </div>
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
  const offerRef = React.useRef(offer);
  offerRef.current = offer;
  const [bidText, setBidText] = React.useState(
    offer.bidCents !== null ? String(Math.round(offer.bidCents / 100)) : "",
  );
  const [payoffText, setPayoffText] = React.useState(
    offer.payoffCents !== null ? String(Math.round(offer.payoffCents / 100)) : "",
  );
  const [notesText, setNotesText] = React.useState(offer.notes ?? "");
  const [copied, setCopied] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [plateCandidates, setPlateCandidates] = React.useState<PlateFipeCandidate[] | null>(null);
  const [plateLookupBusy, setPlateLookupBusy] = React.useState(false);
  const [plateLookupError, setPlateLookupError] = React.useState<string | null>(null);
  const [plateColor, setPlateColor] = React.useState<string | null>(null);
  const bidDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const payoffDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setBidText(offer.bidCents !== null ? String(Math.round(offer.bidCents / 100)) : "");
  }, [offer.id, offer.bidCents]);

  React.useEffect(() => {
    setPayoffText(offer.payoffCents !== null ? String(Math.round(offer.payoffCents / 100)) : "");
  }, [offer.id, offer.payoffCents]);

  React.useEffect(() => {
    setNotesText(offer.notes ?? "");
  }, [offer.id, offer.notes]);

  React.useEffect(() => {
    setPlateCandidates(null);
    setPlateLookupError(null);
    setPlateColor(null);
  }, [offer.id]);

  React.useEffect(() => {
    return () => {
      if (bidDebounceRef.current) clearTimeout(bidDebounceRef.current);
      if (payoffDebounceRef.current) clearTimeout(payoffDebounceRef.current);
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    };
  }, []);

  function setFeedback(next: string | null) {
    setMsg(next);
    onMessage?.(next);
  }

  async function persist(patch: Partial<ConsorcioOffer>) {
    setFeedback(null);
    await onPersist(patch);
  }

  function patchLocal(patch: Partial<ConsorcioOffer>) {
    const next = { ...offerRef.current, ...patch };
    offerRef.current = next;
    onChange(next);
    return next;
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
      if (res.color && res.color !== offerRef.current.color) {
        patchLocal({ color: res.color });
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

  function commitOwnerName(raw: string) {
    const ownerName = raw.trim() || null;
    patchLocal({ ownerName });
    void persist({ ownerName });
  }

  function commitOwnerPhone(raw: string) {
    const ownerPhone = raw.trim() || null;
    patchLocal({ ownerPhone });
    void persist({ ownerPhone });
  }

  function commitBid(raw: string) {
    const bidCents = parseMoneyToCents(raw);
    patchLocal({ bidCents });
    void persist({ bidCents });
  }

  function commitPayoff(raw: string) {
    const payoffCents = parseMoneyToCents(raw);
    patchLocal({ financed: true, payoffCents });
    void persist({ financed: true, payoffCents });
  }

  function commitNotes(raw: string) {
    const notes = raw.trim() || null;
    patchLocal({ notes });
    void persist({ notes });
  }

  const contactFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <SoftTextField
        id="owner-name"
        label={publicMode ? "Seu nome" : "Nome do dono"}
        value={offer.ownerName ?? ""}
        autoComplete="name"
        placeholder={publicMode ? "Como prefere ser chamado" : undefined}
        onCommit={commitOwnerName}
      />
      <SoftTextField
        id="owner-phone"
        label="Telefone / WhatsApp"
        value={offer.ownerPhone ?? ""}
        inputMode="tel"
        autoComplete="tel"
        placeholder="(11) 99999-0000"
        onCommit={commitOwnerPhone}
      />
    </div>
  );

  return (
    <div className={cn("space-y-4")}>
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
        title={publicMode ? "Placa do veículo" : "Placa e contato"}
        hint={
          publicMode
            ? "Digite a placa e toque em Consultar veículo. O km aparece na foto do painel com o carro ligado."
            : "Digite a placa e toque em Consultar veículo. O km aparece na foto do painel com o carro ligado."
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="plate">Placa</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="plate"
                value={formatPlate(offer.plate)}
                disabled={plateLocked}
                autoComplete="off"
                autoCapitalize="characters"
                onChange={(e) => {
                  const plate = normalizePlate(e.target.value);
                  setPlateCandidates(null);
                  setPlateLookupError(null);
                  setPlateColor(null);
                  const current = offerRef.current;
                  const cleared =
                    current.fipe || current.brand || current.model || current.modelYear
                      ? {
                          plate,
                          fipe: null,
                          brand: null,
                          model: null,
                          modelYear: null,
                        }
                      : { plate };
                  patchLocal(cleared);
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
          {!publicMode ? contactFields : null}
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
              color: plateColor ?? offerRef.current.color,
            };
            patchLocal(patch);
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
          <Label htmlFor="bid">Valor do lance (R$)</Label>
          <Input
            id="bid"
            inputMode="numeric"
            value={bidText}
            onChange={(e) => {
              const raw = e.target.value;
              setBidText(raw);
              if (bidDebounceRef.current) clearTimeout(bidDebounceRef.current);
              bidDebounceRef.current = setTimeout(() => commitBid(raw), 450);
            }}
            onBlur={() => {
              if (bidDebounceRef.current) clearTimeout(bidDebounceRef.current);
              commitBid(bidText);
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
                patchLocal({ financed: true });
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
                patchLocal({ financed: false, payoffCents: null });
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
              <Label htmlFor="payoff">Valor da quitação (R$)</Label>
              <Input
                id="payoff"
                inputMode="numeric"
                value={payoffText}
                onChange={(e) => {
                  const raw = e.target.value;
                  setPayoffText(raw);
                  if (payoffDebounceRef.current) clearTimeout(payoffDebounceRef.current);
                  payoffDebounceRef.current = setTimeout(() => commitPayoff(raw), 450);
                }}
                onBlur={() => {
                  if (payoffDebounceRef.current) clearTimeout(payoffDebounceRef.current);
                  commitPayoff(payoffText);
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
            patchLocal({ tires });
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
            const merged = patchLocal({
              photos: next.photos,
              hasDamage: next.hasDamage,
            });
            void persist({ photos: merged.photos, hasDamage: merged.hasDamage });
          }}
        />
      </Section>

      <Section publicMode={publicMode} title="Observações" hint="Opcional.">
        <Textarea
          id="notes"
          value={notesText}
          onChange={(e) => {
            const raw = e.target.value;
            setNotesText(raw);
            if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
            notesDebounceRef.current = setTimeout(() => commitNotes(raw), 450);
          }}
          onBlur={() => {
            if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
            commitNotes(notesText);
          }}
          rows={3}
          placeholder="Algo que o lojista precise saber"
        />
      </Section>

      {publicMode ? (
        <Section
          publicMode
          title="Seus dados"
          hint="Para o consignador entrar em contato sobre a proposta."
        >
          {contactFields}
        </Section>
      ) : null}

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

"use client";

import Link from "next/link";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AVALIACAO_TERMS_PATH } from "@/lib/consorcio/terms";

/** Aceite + envio no final do formulário público — sem barra fixa. */
export function PublicClosing({
  ready,
  busy,
  termsAccepted,
  onTermsAcceptedChange,
  onSubmit,
  message,
}: {
  ready: boolean;
  busy: boolean;
  termsAccepted: boolean;
  onTermsAcceptedChange: (next: boolean) => void;
  onSubmit: () => void;
  message?: string | null;
}) {
  const canSend = ready && termsAccepted;

  return (
    <section className="space-y-4 overflow-hidden rounded-[1.25rem] border border-navy/[0.08] bg-card shadow-card">
      <div className="space-y-1 border-b border-navy/[0.06] px-5 py-4">
        <div className="accent-rule mb-2 max-w-[4.5rem]" />
        <h2 className="text-base font-semibold tracking-tight text-navy">Enviar avaliação</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Revise os dados, aceite a declaração e envie. O consignador recebe na hora.
        </p>
      </div>
      <div className="space-y-4 px-5 py-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-navy/10 bg-navy/[0.03] px-3 py-3">
          <Checkbox
            checked={termsAccepted}
            onCheckedChange={(v) => onTermsAcceptedChange(v === true)}
            className="mt-0.5"
            aria-describedby="termos-avaliacao-desc"
          />
          <span id="termos-avaliacao-desc" className="text-sm leading-relaxed text-navy/80">
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

        {message ? (
          <p className="rounded-xl border border-coral/30 bg-coral/[0.08] px-3 py-2 text-sm text-navy">
            {message}
          </p>
        ) : null}

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
    </section>
  );
}

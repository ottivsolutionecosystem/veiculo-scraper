"use client";

import { Check, Loader2, X } from "lucide-react";

import type { ConsorcioFipeSelection } from "@veiculo/types";
import { formatCents } from "@/lib/format";
import type { PlateFipeCandidate } from "@/lib/consorcio/fipe-client";
import { cn } from "@/lib/utils";

/** FIPE só pela placa — sem cascade manual marca/modelo/ano. */
export function FipeCascade({
  value,
  onChange,
  plateCandidates = null,
  plateLookupBusy = false,
  plateLookupError = null,
  hasValidPlate = false,
}: {
  value: ConsorcioFipeSelection | null;
  onChange: (next: ConsorcioFipeSelection | null) => void;
  plateCandidates?: PlateFipeCandidate[] | null;
  plateLookupBusy?: boolean;
  plateLookupError?: string | null;
  hasValidPlate?: boolean;
}) {
  const fromPlate = Boolean(plateCandidates && plateCandidates.length > 0);

  function clearSelection() {
    onChange(null);
  }

  function pickCandidate(candidate: PlateFipeCandidate) {
    if (value?.code === candidate.code) {
      clearSelection();
      return;
    }
    const { principal: _p, ...fipe } = candidate;
    onChange(fipe);
  }

  return (
    <div className="space-y-3">
      {plateLookupBusy ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Consultando o veículo pela placa…
        </p>
      ) : null}
      {plateLookupError ? <p className="text-sm text-destructive">{plateLookupError}</p> : null}

      {value ? (
        <div className="flex items-start gap-3 rounded-xl border border-navy/10 bg-navy/[0.03] px-3 py-3">
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-navy">
              {value.brand} {value.model}
            </p>
            <p className="text-xs text-muted-foreground">
              {value.modelYear}
              {value.fuel ? ` · ${value.fuel}` : ""} · FIPE {formatCents(value.priceCents)}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {value.code} · ref. {value.referenceMonth}
            </p>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-navy/15 bg-white px-2.5 py-1.5 text-xs font-medium text-navy transition hover:border-destructive/40 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
            Trocar
          </button>
        </div>
      ) : null}

      {fromPlate ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-navy">
            {value ? "Ou escolha outra versão" : "Qual versão bate com o documento do veículo?"}
          </p>
          <p className="text-xs text-muted-foreground">
            Toque na opção correta. Toque de novo na selecionada para limpar.
          </p>
          <ul className="space-y-2">
            {plateCandidates!.map((c) => {
              const selected = value?.code === c.code;
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => pickCandidate(c)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition",
                      selected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-navy/10 bg-white hover:border-navy/25",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-navy/20 bg-white",
                      )}
                    >
                      {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="block text-sm font-semibold text-navy">
                        {c.brand} {c.model}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {c.modelYear}
                        {c.fuel ? ` · ${c.fuel}` : ""}
                        {c.principal ? " · sugerida" : ""}
                        {selected ? " · toque para limpar" : ""}
                      </span>
                      <span className="block text-sm font-medium text-navy">
                        FIPE {formatCents(c.priceCents)}
                      </span>
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {c.code} · ref. {c.referenceMonth}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {!plateLookupBusy && !fromPlate && !value ? (
        <p className="rounded-xl border border-dashed border-navy/15 bg-navy/[0.02] px-3 py-3 text-sm text-muted-foreground">
          {hasValidPlate
            ? "Toque em Consultar veículo acima para buscar as versões FIPE desta placa."
            : "Informe uma placa válida e consulte o veículo. A FIPE vem só pela placa."}
        </p>
      ) : null}
    </div>
  );
}

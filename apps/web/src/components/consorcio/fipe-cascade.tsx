"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import type { ConsorcioFipeSelection } from "@veiculo/types";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCents } from "@/lib/format";
import {
  fetchFipePrice,
  listFipeBrands,
  listFipeModels,
  listFipeYears,
  type FipeOption,
  type FipeVehicleType,
  type PlateFipeCandidate,
} from "@/lib/consorcio/fipe-client";
import { cn } from "@/lib/utils";

export function FipeCascade({
  value,
  onChange,
  plateCandidates = null,
  plateLookupBusy = false,
  plateLookupError = null,
}: {
  value: ConsorcioFipeSelection | null;
  onChange: (next: ConsorcioFipeSelection | null) => void;
  plateCandidates?: PlateFipeCandidate[] | null;
  plateLookupBusy?: boolean;
  plateLookupError?: string | null;
}) {
  const [type, setType] = React.useState<FipeVehicleType>(value?.vehicleType ?? "carros");
  const [brands, setBrands] = React.useState<FipeOption[]>([]);
  const [models, setModels] = React.useState<FipeOption[]>([]);
  const [years, setYears] = React.useState<FipeOption[]>([]);
  const [brand, setBrand] = React.useState("");
  const [model, setModel] = React.useState("");
  const [year, setYear] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [manual, setManual] = React.useState(false);

  const fromPlate = Boolean(plateCandidates && plateCandidates.length > 0);

  React.useEffect(() => {
    if (fromPlate) setManual(false);
  }, [fromPlate, plateCandidates]);

  React.useEffect(() => {
    if (fromPlate && !manual) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    void listFipeBrands(type)
      .then((rows) => {
        if (!cancelled) setBrands(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Falha ao carregar marcas.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, fromPlate, manual]);

  async function onBrand(code: string) {
    setBrand(code);
    setModel("");
    setYear("");
    setModels([]);
    setYears([]);
    onChange(null);
    setBusy(true);
    try {
      setModels(await listFipeModels(type, code));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha nos modelos.");
    } finally {
      setBusy(false);
    }
  }

  async function onModel(code: string) {
    setModel(code);
    setYear("");
    setYears([]);
    onChange(null);
    setBusy(true);
    try {
      setYears(await listFipeYears(type, brand, code));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha nos anos.");
    } finally {
      setBusy(false);
    }
  }

  async function onYear(code: string) {
    setYear(code);
    setBusy(true);
    setError(null);
    try {
      const price = await fetchFipePrice(type, brand, model, code);
      onChange(price);
    } catch (err) {
      onChange(null);
      setError(err instanceof Error ? err.message : "Falha no preço FIPE.");
    } finally {
      setBusy(false);
    }
  }

  function pickCandidate(candidate: PlateFipeCandidate) {
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

      {fromPlate && !manual ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-navy">
            Qual versão bate com o documento do veículo?
          </p>
          <p className="text-xs text-muted-foreground">
            Toque na opção correta. Se houver mais de uma, confira marca, modelo e ano no CRLV.
          </p>
          <ul className="space-y-2">
            {plateCandidates!.map((c) => {
              const selected = value?.code === c.code;
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => pickCandidate(c)}
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
          <button
            type="button"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => setManual(true)}
          >
            Não achei — escolher marca, modelo e ano
          </button>
        </div>
      ) : null}

      {(!fromPlate || manual) && !plateLookupBusy ? (
        <div className="space-y-3">
          {fromPlate && manual ? (
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setManual(false)}
            >
              Voltar às opções da placa
            </button>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tipo">
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as FipeVehicleType);
                  setBrand("");
                  setModel("");
                  setYear("");
                  setModels([]);
                  setYears([]);
                  onChange(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carros">Carro</SelectItem>
                  <SelectItem value="motos">Moto</SelectItem>
                  <SelectItem value="caminhoes">Caminhão</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Marca">
              <Select value={brand || undefined} onValueChange={onBrand} disabled={!brands.length}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.code} value={b.code}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Modelo">
              <Select value={model || undefined} onValueChange={onModel} disabled={!models.length}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.code} value={m.code}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ano / combustível (FIPE)">
              <Select value={year || undefined} onValueChange={onYear} disabled={!years.length}>
                <SelectTrigger>
                  <SelectValue placeholder="Se houver mais de um, escolha o certo" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.code} value={y.code}>
                      {y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      ) : null}

      {busy && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando FIPE…
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value && fromPlate && !manual ? null : value ? (
        <p className="rounded-xl border border-navy/10 bg-navy/[0.03] px-3 py-2 text-sm">
          <span className="font-medium text-navy">{value.code}</span> · {value.brand} {value.model}{" "}
          {value.modelYear} · {formatCents(value.priceCents)}
          <span className="block text-xs text-muted-foreground">Ref. {value.referenceMonth}</span>
        </p>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

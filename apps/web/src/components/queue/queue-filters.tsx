"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { BODY_TYPES, BRANDS, FUEL_TYPES, SOURCES, TRANSMISSIONS } from "@/lib/catalog";
import {
  BODY_TYPE_LABELS,
  FUEL_LABELS,
  SCORE_BAND_LABELS,
  TRANSMISSION_LABELS,
  sourceLabel,
} from "@/lib/labels";
import { useChromeVisibility } from "@/components/layout/chrome-visibility";
import { useVisualViewportHeight } from "@/lib/visual-viewport";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const BANDS = ["quente", "boa", "morna", "fria"] as const;

const SHEET_KEYS = [
  "brand",
  "yearMin",
  "yearMax",
  "priceMin",
  "priceMax",
  "kmMin",
  "kmMax",
  "transmission",
  "fuelType",
  "bodyType",
  "scoreBand",
  "source",
] as const;

function apply(pathname: string, current: URLSearchParams, patch: Record<string, string | null>) {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function FilterFields({
  yearMin,
  yearMax,
  priceMin,
  priceMax,
  kmMin,
  kmMax,
  brand,
  transmission,
  fuelType,
  bodyType,
  scoreBand,
  source,
  onYearMin,
  onYearMax,
  onPriceMin,
  onPriceMax,
  onKmMin,
  onKmMax,
  onGo,
}: {
  yearMin: string;
  yearMax: string;
  priceMin: string;
  priceMax: string;
  kmMin: string;
  kmMax: string;
  brand: string;
  transmission: string;
  fuelType: string;
  bodyType: string;
  scoreBand: string;
  source: string;
  onYearMin: (v: string) => void;
  onYearMax: (v: string) => void;
  onPriceMin: (v: string) => void;
  onPriceMax: (v: string) => void;
  onKmMin: (v: string) => void;
  onKmMax: (v: string) => void;
  onGo: (patch: Record<string, string | null>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
      <Select value={brand || "all"} onValueChange={(v) => onGo({ brand: v === "all" ? null : v })}>
        <SelectTrigger aria-label="Marca" className="lg:w-40">
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as marcas</SelectItem>
          {BRANDS.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        min={0}
        value={yearMin}
        onChange={(e) => onYearMin(e.target.value)}
        placeholder="Ano de"
        aria-label="Ano mínimo"
        className="lg:w-24"
      />
      <Input
        type="number"
        min={0}
        value={yearMax}
        onChange={(e) => onYearMax(e.target.value)}
        placeholder="Ano até"
        aria-label="Ano máximo"
        className="lg:w-24"
      />
      <Input
        type="number"
        min={0}
        value={priceMin}
        onChange={(e) => onPriceMin(e.target.value)}
        placeholder="De R$"
        aria-label="Preço mínimo"
        className="lg:w-28"
      />
      <Input
        type="number"
        min={0}
        value={priceMax}
        onChange={(e) => onPriceMax(e.target.value)}
        placeholder="Até R$"
        aria-label="Preço máximo"
        className="lg:w-28"
      />
      <Input
        type="number"
        min={0}
        value={kmMin}
        onChange={(e) => onKmMin(e.target.value)}
        placeholder="Km de"
        aria-label="Km mínimo"
        className="lg:w-28"
      />
      <Input
        type="number"
        min={0}
        value={kmMax}
        onChange={(e) => onKmMax(e.target.value)}
        placeholder="Km até"
        aria-label="Km máximo"
        className="lg:w-28"
      />
      <Select
        value={transmission || "all"}
        onValueChange={(v) => onGo({ transmission: v === "all" ? null : v })}
      >
        <SelectTrigger aria-label="Câmbio" className="lg:w-36">
          <SelectValue placeholder="Câmbio" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Qualquer câmbio</SelectItem>
          {TRANSMISSIONS.map((t) => (
            <SelectItem key={t} value={t}>
              {TRANSMISSION_LABELS[t] ?? t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={fuelType || "all"} onValueChange={(v) => onGo({ fuelType: v === "all" ? null : v })}>
        <SelectTrigger aria-label="Combustível" className="lg:w-36">
          <SelectValue placeholder="Combustível" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Qualquer combustível</SelectItem>
          {FUEL_TYPES.map((f) => (
            <SelectItem key={f} value={f}>
              {FUEL_LABELS[f] ?? f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={bodyType || "all"} onValueChange={(v) => onGo({ bodyType: v === "all" ? null : v })}>
        <SelectTrigger aria-label="Carroceria" className="lg:w-36">
          <SelectValue placeholder="Carroceria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Qualquer carroceria</SelectItem>
          {BODY_TYPES.map((b) => (
            <SelectItem key={b} value={b}>
              {BODY_TYPE_LABELS[b] ?? b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={scoreBand || "all"} onValueChange={(v) => onGo({ scoreBand: v === "all" ? null : v })}>
        <SelectTrigger aria-label="Score" className="lg:w-36">
          <SelectValue placeholder="Score" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Qualquer score</SelectItem>
          {BANDS.map((band) => (
            <SelectItem key={band} value={band}>
              {SCORE_BAND_LABELS[band]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={source || "all"} onValueChange={(v) => onGo({ source: v === "all" ? null : v })}>
        <SelectTrigger aria-label="Fonte" className="lg:w-36">
          <SelectValue placeholder="Fonte" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as fontes</SelectItem>
          {SOURCES.map((item) => (
            <SelectItem key={item} value={item}>
              {sourceLabel(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function useDebouncedParam(
  value: string,
  key: string,
  current: string,
  go: (patch: Record<string, string | null>) => void,
) {
  React.useEffect(() => {
    if (value === current) return;
    const handle = window.setTimeout(() => {
      const n = Number(value);
      go({
        [key]: value && Number.isFinite(n) && n >= 0 ? String(n) : null,
      });
    }, 400);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

/** Filtros da fila: no telefone viram uma folha; no desktop ficam na linha. */
export function QueueFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lockChrome } = useChromeVisibility();
  const viewportHeight = useVisualViewportHeight();
  const [q, setQ] = React.useState(searchParams.get("q") ?? "");
  const [yearMin, setYearMin] = React.useState(searchParams.get("yearMin") ?? "");
  const [yearMax, setYearMax] = React.useState(searchParams.get("yearMax") ?? "");
  const [priceMin, setPriceMin] = React.useState(searchParams.get("priceMin") ?? "");
  const [priceMax, setPriceMax] = React.useState(searchParams.get("priceMax") ?? "");
  const [kmMin, setKmMin] = React.useState(searchParams.get("kmMin") ?? "");
  const [kmMax, setKmMax] = React.useState(searchParams.get("kmMax") ?? "");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    lockChrome("queue-filters", open);
    return () => lockChrome("queue-filters", false);
  }, [open, lockChrome]);

  React.useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setYearMin(searchParams.get("yearMin") ?? "");
    setYearMax(searchParams.get("yearMax") ?? "");
    setPriceMin(searchParams.get("priceMin") ?? "");
    setPriceMax(searchParams.get("priceMax") ?? "");
    setKmMin(searchParams.get("kmMin") ?? "");
    setKmMax(searchParams.get("kmMax") ?? "");
  }, [searchParams]);

  const paramsRef = React.useRef(searchParams);
  paramsRef.current = searchParams;

  function go(patch: Record<string, string | null>) {
    router.push(apply(pathname, paramsRef.current, patch));
  }

  React.useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const handle = window.setTimeout(() => go({ q: q.trim() || null }), 400);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useDebouncedParam(yearMin, "yearMin", searchParams.get("yearMin") ?? "", go);
  useDebouncedParam(yearMax, "yearMax", searchParams.get("yearMax") ?? "", go);
  useDebouncedParam(priceMin, "priceMin", searchParams.get("priceMin") ?? "", go);
  useDebouncedParam(priceMax, "priceMax", searchParams.get("priceMax") ?? "", go);
  useDebouncedParam(kmMin, "kmMin", searchParams.get("kmMin") ?? "", go);
  useDebouncedParam(kmMax, "kmMax", searchParams.get("kmMax") ?? "", go);

  const sheetActive = SHEET_KEYS.filter((key) => searchParams.get(key)).length;
  const anyActive = sheetActive + (searchParams.get("q") ? 1 : 0);

  function limparSheet() {
    setYearMin("");
    setYearMax("");
    setPriceMin("");
    setPriceMax("");
    setKmMin("");
    setKmMax("");
    go(Object.fromEntries(SHEET_KEYS.map((key) => [key, null])));
  }

  function limparTudo() {
    setQ("");
    setYearMin("");
    setYearMax("");
    setPriceMin("");
    setPriceMax("");
    setKmMin("");
    setKmMax("");
    go({ q: null, ...Object.fromEntries(SHEET_KEYS.map((key) => [key, null])) });
  }

  const fieldProps = {
    yearMin,
    yearMax,
    priceMin,
    priceMax,
    kmMin,
    kmMax,
    brand: searchParams.get("brand") ?? "",
    transmission: searchParams.get("transmission") ?? "",
    fuelType: searchParams.get("fuelType") ?? "",
    bodyType: searchParams.get("bodyType") ?? "",
    scoreBand: searchParams.get("scoreBand") ?? "",
    source: searchParams.get("source") ?? "",
    onYearMin: setYearMin,
    onYearMax: setYearMax,
    onPriceMin: setPriceMin,
    onPriceMax: setPriceMax,
    onKmMin: setKmMin,
    onKmMax: setKmMax,
    onGo: go,
  };

  return (
    <>
      <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome ou #número"
          aria-label="Nome ou número do veículo"
          className="lg:w-48"
        />
        <FilterFields {...fieldProps} />
        {anyActive > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={limparTudo}>
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <div className="min-w-0 flex-1">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome ou #número"
            aria-label="Nome ou número do veículo"
          />
        </div>
        <Button type="button" variant="outline" className="min-w-[7rem] shrink-0" onClick={() => setOpen(true)}>
          <SlidersHorizontal />
          Filtros{sheetActive > 0 ? ` (${sheetActive})` : ""}
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="overflow-y-auto pb-[var(--safe-bottom)]"
            style={{ maxHeight: viewportHeight ? Math.round(viewportHeight * 0.85) : "85dvh" }}
          >
            <SheetHeader>
              <SheetTitle>Filtros da fila</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              <FilterFields {...fieldProps} />
              {sheetActive > 0 && (
                <Button type="button" variant="ghost" className="w-full" onClick={limparSheet}>
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

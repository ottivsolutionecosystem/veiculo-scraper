"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { BRANDS, SOURCES } from "@/lib/catalog";
import { SCORE_BAND_LABELS, sourceLabel } from "@/lib/labels";
import { useChromeVisibility } from "@/components/layout/chrome-visibility";
import { useVisualViewportHeight } from "@/lib/visual-viewport";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const BANDS = ["quente", "boa", "morna", "fria"] as const;

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
  priceMax,
  brand,
  scoreBand,
  source,
  onPriceMax,
  onGo,
}: {
  priceMax: string;
  brand: string;
  scoreBand: string;
  source: string;
  onPriceMax: (v: string) => void;
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
        value={priceMax}
        onChange={(e) => onPriceMax(e.target.value)}
        placeholder="Até R$"
        aria-label="Preço máximo"
        className="lg:w-28"
      />
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

/** Filtros da fila: no telefone viram uma folha; no desktop ficam na linha. */
export function QueueFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lockChrome } = useChromeVisibility();
  const viewportHeight = useVisualViewportHeight();
  const [q, setQ] = React.useState(searchParams.get("q") ?? "");
  const [priceMax, setPriceMax] = React.useState(searchParams.get("priceMax") ?? "");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    lockChrome("queue-filters", open);
    return () => lockChrome("queue-filters", false);
  }, [open, lockChrome]);

  React.useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setPriceMax(searchParams.get("priceMax") ?? "");
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

  React.useEffect(() => {
    const current = searchParams.get("priceMax") ?? "";
    if (priceMax === current) return;
    const handle = window.setTimeout(() => {
      const n = Number(priceMax);
      go({ priceMax: priceMax && Number.isFinite(n) && n > 0 ? String(n) : null });
    }, 400);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceMax]);

  const sheetActive = ["brand", "priceMax", "scoreBand", "source"].filter((key) => searchParams.get(key)).length;
  const anyActive = sheetActive + (searchParams.get("q") ? 1 : 0);

  function limparSheet() {
    setPriceMax("");
    go({ brand: null, priceMax: null, scoreBand: null, source: null });
  }

  function limparTudo() {
    setQ("");
    setPriceMax("");
    go({ q: null, brand: null, priceMax: null, scoreBand: null, source: null });
  }

  const fieldProps = {
    priceMax,
    brand: searchParams.get("brand") ?? "",
    scoreBand: searchParams.get("scoreBand") ?? "",
    source: searchParams.get("source") ?? "",
    onPriceMax: setPriceMax,
    onGo: go,
  };

  return (
    <>
      <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome do veículo"
          aria-label="Nome do veículo"
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
            placeholder="Nome do veículo"
            aria-label="Nome do veículo"
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

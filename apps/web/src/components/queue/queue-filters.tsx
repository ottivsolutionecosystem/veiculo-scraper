"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { BRANDS, SOURCES } from "@/lib/catalog";
import { SCORE_BAND_LABELS, sourceLabel } from "@/lib/labels";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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

/** Filtros da fila: nome, marca, preço, score e fonte. Mantém scope e tipo. */
export function QueueFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState(searchParams.get("q") ?? "");
  const [priceMax, setPriceMax] = React.useState(searchParams.get("priceMax") ?? "");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só o texto digitado dispara o debounce
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

  const active = Boolean(
    searchParams.get("q") ||
      searchParams.get("brand") ||
      searchParams.get("priceMax") ||
      searchParams.get("scoreBand") ||
      searchParams.get("source"),
  );

  function limpar() {
    setQ("");
    setPriceMax("");
    go({ q: null, brand: null, priceMax: null, scoreBand: null, source: null });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nome do veículo"
        aria-label="Nome do veículo"
        className="h-9 sm:w-48"
      />
      <Select
        value={searchParams.get("brand") || "all"}
        onValueChange={(v) => go({ brand: v === "all" ? null : v })}
      >
        <SelectTrigger className="h-9 sm:w-40" aria-label="Marca">
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
        onChange={(e) => setPriceMax(e.target.value)}
        placeholder="Até R$"
        aria-label="Preço máximo"
        className="h-9 sm:w-28"
      />
      <Select
        value={searchParams.get("scoreBand") || "all"}
        onValueChange={(v) => go({ scoreBand: v === "all" ? null : v })}
      >
        <SelectTrigger className="h-9 sm:w-36" aria-label="Score">
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
      <Select
        value={searchParams.get("source") || "all"}
        onValueChange={(v) => go({ source: v === "all" ? null : v })}
      >
        <SelectTrigger className="h-9 sm:w-36" aria-label="Fonte">
          <SelectValue placeholder="Fonte" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as fontes</SelectItem>
          {SOURCES.map((source) => (
            <SelectItem key={source} value={source}>
              {sourceLabel(source)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active && (
        <Button type="button" variant="ghost" size="sm" className="h-9 px-2" onClick={limpar}>
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const BANDS = ["quente", "boa", "morna", "fria"] as const;

const FILTER_KEYS = [
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

type FilterKey = (typeof FILTER_KEYS)[number];

type Draft = Record<FilterKey, string>;

function emptyDraft(): Draft {
  return {
    brand: "",
    yearMin: "",
    yearMax: "",
    priceMin: "",
    priceMax: "",
    kmMin: "",
    kmMax: "",
    transmission: "",
    fuelType: "",
    bodyType: "",
    scoreBand: "",
    source: "",
  };
}

function draftFromParams(params: URLSearchParams): Draft {
  const next = emptyDraft();
  for (const key of FILTER_KEYS) next[key] = params.get(key) ?? "";
  return next;
}

function apply(pathname: string, current: URLSearchParams, patch: Record<string, string | null>) {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function formatReais(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatKm(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n.toLocaleString("pt-BR")} km`;
}

type Chip = { id: string; keys: FilterKey[]; label: string };

function chipsFromDraft(draft: Draft): Chip[] {
  const chips: Chip[] = [];
  if (draft.brand) chips.push({ id: "brand", keys: ["brand"], label: draft.brand });
  if (draft.yearMin || draft.yearMax) {
    const label =
      draft.yearMin && draft.yearMax
        ? `${draft.yearMin}–${draft.yearMax}`
        : draft.yearMin
          ? `Ano ≥ ${draft.yearMin}`
          : `Ano ≤ ${draft.yearMax}`;
    chips.push({ id: "year", keys: ["yearMin", "yearMax"], label });
  }
  if (draft.priceMin || draft.priceMax) {
    const label =
      draft.priceMin && draft.priceMax
        ? `${formatReais(draft.priceMin)} – ${formatReais(draft.priceMax)}`
        : draft.priceMin
          ? `A partir de ${formatReais(draft.priceMin)}`
          : `Até ${formatReais(draft.priceMax)}`;
    chips.push({ id: "price", keys: ["priceMin", "priceMax"], label });
  }
  if (draft.kmMin || draft.kmMax) {
    const label =
      draft.kmMin && draft.kmMax
        ? `${formatKm(draft.kmMin)} – ${formatKm(draft.kmMax)}`
        : draft.kmMin
          ? `Km ≥ ${Number(draft.kmMin).toLocaleString("pt-BR")}`
          : `Km ≤ ${Number(draft.kmMax).toLocaleString("pt-BR")}`;
    chips.push({ id: "km", keys: ["kmMin", "kmMax"], label });
  }
  if (draft.transmission) {
    chips.push({
      id: "transmission",
      keys: ["transmission"],
      label: TRANSMISSION_LABELS[draft.transmission] ?? draft.transmission,
    });
  }
  if (draft.fuelType) {
    chips.push({
      id: "fuelType",
      keys: ["fuelType"],
      label: FUEL_LABELS[draft.fuelType] ?? draft.fuelType,
    });
  }
  if (draft.bodyType) {
    chips.push({
      id: "bodyType",
      keys: ["bodyType"],
      label: BODY_TYPE_LABELS[draft.bodyType] ?? draft.bodyType,
    });
  }
  if (draft.scoreBand) {
    chips.push({
      id: "scoreBand",
      keys: ["scoreBand"],
      label: SCORE_BAND_LABELS[draft.scoreBand as keyof typeof SCORE_BAND_LABELS] ?? draft.scoreBand,
    });
  }
  if (draft.source) {
    chips.push({ id: "source", keys: ["source"], label: sourceLabel(draft.source) });
  }
  return chips;
}

function countActive(draft: Draft): number {
  return FILTER_KEYS.filter((key) => draft[key]).length;
}

function useIsDesktop() {
  const [desktop, setDesktop] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const applyMq = () => setDesktop(mq.matches);
    applyMq();
    mq.addEventListener("change", applyMq);
    return () => mq.removeEventListener("change", applyMq);
  }, []);
  return desktop;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-navy/45">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function RangeRow({
  label,
  min,
  max,
  minPlaceholder,
  maxPlaceholder,
  onMin,
  onMax,
  minAria,
  maxAria,
}: {
  label: string;
  min: string;
  max: string;
  minPlaceholder: string;
  maxPlaceholder: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  minAria: string;
  maxAria: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-navy/70">{label}</Label>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          value={min}
          onChange={(e) => onMin(e.target.value)}
          placeholder={minPlaceholder}
          aria-label={minAria}
        />
        <span className="text-xs font-medium text-navy/35">até</span>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          value={max}
          onChange={(e) => onMax(e.target.value)}
          placeholder={maxPlaceholder}
          aria-label={maxAria}
        />
      </div>
    </div>
  );
}

function FilterPanel({
  draft,
  onPatch,
}: {
  draft: Draft;
  onPatch: <K extends FilterKey>(key: K, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <Section title="Veículo">
        <div className="space-y-1.5">
          <Label className="text-navy/70">Marca</Label>
          <Select value={draft.brand || "all"} onValueChange={(v) => onPatch("brand", v === "all" ? "" : v)}>
            <SelectTrigger aria-label="Marca">
              <SelectValue placeholder="Todas as marcas" />
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
        </div>
        <RangeRow
          label="Ano"
          min={draft.yearMin}
          max={draft.yearMax}
          minPlaceholder="De"
          maxPlaceholder="Até"
          onMin={(v) => onPatch("yearMin", v)}
          onMax={(v) => onPatch("yearMax", v)}
          minAria="Ano mínimo"
          maxAria="Ano máximo"
        />
      </Section>

      <Section title="Faixas">
        <RangeRow
          label="Preço (R$)"
          min={draft.priceMin}
          max={draft.priceMax}
          minPlaceholder="Mínimo"
          maxPlaceholder="Máximo"
          onMin={(v) => onPatch("priceMin", v)}
          onMax={(v) => onPatch("priceMax", v)}
          minAria="Preço mínimo"
          maxAria="Preço máximo"
        />
        <RangeRow
          label="Quilometragem"
          min={draft.kmMin}
          max={draft.kmMax}
          minPlaceholder="Mínimo"
          maxPlaceholder="Máximo"
          onMin={(v) => onPatch("kmMin", v)}
          onMax={(v) => onPatch("kmMax", v)}
          minAria="Km mínimo"
          maxAria="Km máximo"
        />
      </Section>

      <Section title="Características">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-navy/70">Câmbio</Label>
            <Select
              value={draft.transmission || "all"}
              onValueChange={(v) => onPatch("transmission", v === "all" ? "" : v)}
            >
              <SelectTrigger aria-label="Câmbio">
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer</SelectItem>
                {TRANSMISSIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TRANSMISSION_LABELS[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-navy/70">Combustível</Label>
            <Select
              value={draft.fuelType || "all"}
              onValueChange={(v) => onPatch("fuelType", v === "all" ? "" : v)}
            >
              <SelectTrigger aria-label="Combustível">
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer</SelectItem>
                {FUEL_TYPES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FUEL_LABELS[f] ?? f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-navy/70">Carroceria</Label>
            <Select
              value={draft.bodyType || "all"}
              onValueChange={(v) => onPatch("bodyType", v === "all" ? "" : v)}
            >
              <SelectTrigger aria-label="Carroceria">
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer</SelectItem>
                {BODY_TYPES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {BODY_TYPE_LABELS[b] ?? b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-navy/70">Score</Label>
            <Select
              value={draft.scoreBand || "all"}
              onValueChange={(v) => onPatch("scoreBand", v === "all" ? "" : v)}
            >
              <SelectTrigger aria-label="Score">
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer</SelectItem>
                {BANDS.map((band) => (
                  <SelectItem key={band} value={band}>
                    {SCORE_BAND_LABELS[band]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-navy/70">Fonte</Label>
          <Select value={draft.source || "all"} onValueChange={(v) => onPatch("source", v === "all" ? "" : v)}>
            <SelectTrigger aria-label="Fonte">
              <SelectValue placeholder="Todas as fontes" />
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
      </Section>
    </div>
  );
}

/** Barra enxuta + chips + gaveta com rascunho e aplicar. */
export function QueueFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lockChrome } = useChromeVisibility();
  const viewportHeight = useVisualViewportHeight();
  const desktop = useIsDesktop();

  const [q, setQ] = React.useState(searchParams.get("q") ?? "");
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(() => draftFromParams(searchParams));

  const applied = React.useMemo(() => draftFromParams(searchParams), [searchParams]);
  const chips = React.useMemo(() => chipsFromDraft(applied), [applied]);
  const activeCount = countActive(applied);
  const draftCount = countActive(draft);

  React.useEffect(() => {
    lockChrome("queue-filters", open);
    return () => lockChrome("queue-filters", false);
  }, [open, lockChrome]);

  React.useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    if (!open) setDraft(draftFromParams(searchParams));
  }, [searchParams, open]);

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

  function openSheet() {
    setDraft(draftFromParams(searchParams));
    setOpen(true);
  }

  function patchDraft<K extends FilterKey>(key: K, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function aplicar() {
    const patch: Record<string, string | null> = {};
    for (const key of FILTER_KEYS) {
      const raw = draft[key].trim();
      if (!raw) {
        patch[key] = null;
        continue;
      }
      if (["yearMin", "yearMax", "priceMin", "priceMax", "kmMin", "kmMax"].includes(key)) {
        const n = Number(raw);
        patch[key] = Number.isFinite(n) && n >= 0 ? String(n) : null;
      } else {
        patch[key] = raw;
      }
    }
    go(patch);
    setOpen(false);
  }

  function limparDraft() {
    setDraft(emptyDraft());
  }

  function limparTudo() {
    setQ("");
    setDraft(emptyDraft());
    go({ q: null, ...Object.fromEntries(FILTER_KEYS.map((key) => [key, null])) });
  }

  function removeChip(chip: Chip) {
    go(Object.fromEntries(chip.keys.map((key) => [key, null])));
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/35" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome ou #número"
            aria-label="Nome ou número do veículo"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant={activeCount > 0 ? "navy" : "outline"}
          className="relative shrink-0 gap-2"
          onClick={openSheet}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 min-w-5 justify-center rounded-full bg-card px-1.5 text-[11px] text-navy"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
        {(activeCount > 0 || q) && (
          <Button type="button" variant="ghost" size="sm" className="shrink-0 text-navy/60" onClick={limparTudo}>
            Limpar
          </Button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => removeChip(chip)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-navy/10 bg-navy/[0.04] px-2.5 py-1 text-xs font-medium text-navy/80 transition-colors hover:border-navy/20 hover:bg-navy/[0.07]"
              aria-label={`Remover filtro ${chip.label}`}
            >
              {chip.label}
              <X className="h-3 w-3 text-navy/40" />
            </button>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={desktop ? "right" : "bottom"}
          showClose={false}
          className={cn(
            "flex flex-col gap-0 p-0",
            desktop ? "w-full sm:max-w-md" : "rounded-t-2xl pb-[var(--safe-bottom)]",
          )}
          style={
            desktop
              ? undefined
              : {
                  height: viewportHeight ? Math.round(viewportHeight * 0.88) : "88dvh",
                  maxHeight: viewportHeight ? Math.round(viewportHeight * 0.88) : "88dvh",
                }
          }
        >
          <SheetHeader className="shrink-0 border-b border-navy/5 px-5 py-4 text-left">
            <div className="flex items-start justify-between gap-3 pr-2">
              <div className="space-y-1">
                <SheetTitle>Filtros</SheetTitle>
                <SheetDescription>
                  {draftCount > 0
                    ? `${draftCount} critério${draftCount === 1 ? "" : "s"} selecionado${draftCount === 1 ? "" : "s"}`
                    : "Afine a fila por ano, preço, km e características"}
                </SheetDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 rounded-full p-0"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <FilterPanel draft={draft} onPatch={patchDraft} />
          </div>

          <SheetFooter className="shrink-0 flex-row gap-2 border-t border-navy/5 bg-card/80 px-5 py-3 backdrop-blur-sm">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              disabled={draftCount === 0}
              onClick={limparDraft}
            >
              Limpar
            </Button>
            <Button type="button" className="flex-[1.4]" onClick={aplicar}>
              Aplicar filtros
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

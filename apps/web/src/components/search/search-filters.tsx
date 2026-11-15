"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { BODY_TYPES, BRANDS, FUEL_TYPES, TRANSMISSIONS } from "@/lib/catalog";
import { BODY_TYPE_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/labels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SavedFilters } from "@/components/search/saved-filters";

function fromParams(params: URLSearchParams) {
  return {
    vehicleId: params.get("vehicleId") ?? "",
    brand: params.get("brand") ?? "",
    model: params.get("model") ?? "",
    yearMin: params.get("yearMin") ?? "",
    yearMax: params.get("yearMax") ?? "",
    priceMin: params.get("priceMinCents") ? String(Number(params.get("priceMinCents")) / 100) : "",
    priceMax: params.get("priceMaxCents") ? String(Number(params.get("priceMaxCents")) / 100) : "",
    kmMin: params.get("kmMin") ?? "",
    kmMax: params.get("kmMax") ?? "",
    minFipeDiscountPct: params.get("minFipeDiscountPct") ?? "",
    transmission: params.get("transmission") ?? "",
    fuelType: params.get("fuelType") ?? "",
    bodyType: params.get("bodyType") ?? "",
    sellerType: params.get("sellerType") ?? "all",
    includeInactive: params.get("includeInactive") === "1",
    priceChanged: params.get("priceChanged") === "1",
  };
}

type Draft = ReturnType<typeof fromParams>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-navy/45">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function RangeFields({
  label,
  min,
  max,
  onMin,
  onMax,
  minPlaceholder,
  maxPlaceholder,
}: {
  label: string;
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  minPlaceholder: string;
  maxPlaceholder: string;
}) {
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label className="text-navy/70">{label}</Label>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Input type="number" value={min} placeholder={minPlaceholder} onChange={(e) => onMin(e.target.value)} />
        <span className="text-xs font-medium text-navy/35">até</span>
        <Input type="number" value={max} placeholder={maxPlaceholder} onChange={(e) => onMax(e.target.value)} />
      </div>
    </div>
  );
}

export function SearchFiltersForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draft, setDraft] = React.useState<Draft>(() => fromParams(searchParams));

  React.useEffect(() => {
    setDraft(fromParams(searchParams));
  }, [searchParams]);

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((atual) => ({ ...atual, [key]: value }));
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    const vehicleId = draft.vehicleId.replace(/\D/g, "");
    if (vehicleId) params.set("vehicleId", vehicleId);
    if (draft.brand) params.set("brand", draft.brand);
    if (draft.model) params.set("model", draft.model);
    if (draft.yearMin) params.set("yearMin", draft.yearMin);
    if (draft.yearMax) params.set("yearMax", draft.yearMax);
    if (draft.priceMin) params.set("priceMinCents", String(Number(draft.priceMin) * 100));
    if (draft.priceMax) params.set("priceMaxCents", String(Number(draft.priceMax) * 100));
    if (draft.kmMin) params.set("kmMin", draft.kmMin);
    if (draft.kmMax) params.set("kmMax", draft.kmMax);
    if (draft.minFipeDiscountPct) params.set("minFipeDiscountPct", draft.minFipeDiscountPct);
    if (draft.transmission) params.set("transmission", draft.transmission);
    if (draft.fuelType) params.set("fuelType", draft.fuelType);
    if (draft.bodyType) params.set("bodyType", draft.bodyType);
    if (draft.sellerType && draft.sellerType !== "all") params.set("sellerType", draft.sellerType);
    if (draft.includeInactive) params.set("includeInactive", "1");
    if (draft.priceChanged) params.set("priceChanged", "1");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form
      className="space-y-5 rounded-2xl border border-navy/[0.06] bg-card p-4 shadow-card sm:p-5"
      onSubmit={buscar}
    >
      <Section title="Veículo">
        <div className="space-y-1.5">
          <Label className="text-navy/70">Nº do veículo</Label>
          <Input
            inputMode="numeric"
            value={draft.vehicleId}
            placeholder="ex: 42"
            onChange={(e) => patch("vehicleId", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-navy/70">Marca</Label>
          <Select value={draft.brand || "all"} onValueChange={(v) => patch("brand", v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {BRANDS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-navy/70">Modelo</Label>
          <Input
            value={draft.model}
            placeholder="ex: onix"
            onChange={(e) => patch("model", e.target.value)}
          />
        </div>
        <RangeFields
          label="Ano"
          min={draft.yearMin}
          max={draft.yearMax}
          minPlaceholder="De"
          maxPlaceholder="Até"
          onMin={(v) => patch("yearMin", v)}
          onMax={(v) => patch("yearMax", v)}
        />
      </Section>

      <Section title="Faixas">
        <RangeFields
          label="Preço (R$)"
          min={draft.priceMin}
          max={draft.priceMax}
          minPlaceholder="Mínimo"
          maxPlaceholder="Máximo"
          onMin={(v) => patch("priceMin", v)}
          onMax={(v) => patch("priceMax", v)}
        />
        <RangeFields
          label="Quilometragem"
          min={draft.kmMin}
          max={draft.kmMax}
          minPlaceholder="Mínimo"
          maxPlaceholder="Máximo"
          onMin={(v) => patch("kmMin", v)}
          onMax={(v) => patch("kmMax", v)}
        />
        <div className="space-y-1.5">
          <Label className="text-navy/70">Desconto FIPE mín. (%)</Label>
          <Input
            type="number"
            value={draft.minFipeDiscountPct}
            onChange={(e) => patch("minFipeDiscountPct", e.target.value)}
          />
        </div>
      </Section>

      <Section title="Características">
        <div className="space-y-1.5">
          <Label className="text-navy/70">Câmbio</Label>
          <Select
            value={draft.transmission || "all"}
            onValueChange={(v) => patch("transmission", v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
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
          <Select value={draft.fuelType || "all"} onValueChange={(v) => patch("fuelType", v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
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
          <Select value={draft.bodyType || "all"} onValueChange={(v) => patch("bodyType", v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {BODY_TYPES.map((b) => (
                <SelectItem key={b} value={b}>
                  {BODY_TYPE_LABELS[b] ?? b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-navy/70">Tipo de anunciante</Label>
          <Select value={draft.sellerType} onValueChange={(v) => patch("sellerType", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Particular" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Particular</SelectItem>
              <SelectItem value="dealer">Loja</SelectItem>
              <SelectItem value="all">Particular e loja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title="Opções">
        <div className="flex flex-col justify-center gap-3 sm:col-span-2 lg:col-span-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="includeInactive"
              checked={draft.includeInactive}
              onCheckedChange={(checked) => patch("includeInactive", checked === true)}
            />
            <Label htmlFor="includeInactive">Incluir os que saíram do ar</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="priceChanged"
              checked={draft.priceChanged}
              onCheckedChange={(checked) => patch("priceChanged", checked === true)}
            />
            <Label htmlFor="priceChanged">Só quem mudou de preço</Label>
          </div>
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy/5 pt-4">
        <SavedFilters />
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push(pathname)}>
            Limpar
          </Button>
          <Button type="submit" size="sm">
            Buscar
          </Button>
        </div>
      </div>
    </form>
  );
}

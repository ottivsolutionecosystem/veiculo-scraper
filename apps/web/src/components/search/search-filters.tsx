"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { BRANDS } from "@/lib/catalog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SavedFilters } from "@/components/search/saved-filters";

const TRANSMISSIONS = ["MANUAL", "AUTOMATICO", "AUTOMATIZADO"];

function fromParams(params: URLSearchParams) {
  return {
    brand: params.get("brand") ?? "",
    model: params.get("model") ?? "",
    yearMin: params.get("yearMin") ?? "",
    yearMax: params.get("yearMax") ?? "",
    priceMax: params.get("priceMaxCents") ? String(Number(params.get("priceMaxCents")) / 100) : "",
    minFipeDiscountPct: params.get("minFipeDiscountPct") ?? "",
    transmission: params.get("transmission") ?? "",
    sellerType: params.get("sellerType") ?? "all",
    includeInactive: params.get("includeInactive") === "1",
    priceChanged: params.get("priceChanged") === "1",
  };
}

type Draft = ReturnType<typeof fromParams>;

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
    if (draft.brand) params.set("brand", draft.brand);
    if (draft.model) params.set("model", draft.model);
    if (draft.yearMin) params.set("yearMin", draft.yearMin);
    if (draft.yearMax) params.set("yearMax", draft.yearMax);
    if (draft.priceMax) params.set("priceMaxCents", String(Number(draft.priceMax) * 100));
    if (draft.minFipeDiscountPct) params.set("minFipeDiscountPct", draft.minFipeDiscountPct);
    if (draft.transmission) params.set("transmission", draft.transmission);
    if (draft.sellerType && draft.sellerType !== "all") params.set("sellerType", draft.sellerType);
    if (draft.includeInactive) params.set("includeInactive", "1");
    if (draft.priceChanged) params.set("priceChanged", "1");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form className="space-y-4 rounded-lg border p-4" onSubmit={buscar}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label>Marca</Label>
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

        <div className="space-y-1">
          <Label>Modelo</Label>
          <Input
            value={draft.model}
            placeholder="ex: onix"
            onChange={(e) => patch("model", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>Ano mínimo</Label>
          <Input
            type="number"
            value={draft.yearMin}
            onChange={(e) => patch("yearMin", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>Ano máximo</Label>
          <Input
            type="number"
            value={draft.yearMax}
            onChange={(e) => patch("yearMax", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>Preço máximo (R$)</Label>
          <Input
            type="number"
            value={draft.priceMax}
            onChange={(e) => patch("priceMax", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>Desconto FIPE mínimo (%)</Label>
          <Input
            type="number"
            value={draft.minFipeDiscountPct}
            onChange={(e) => patch("minFipeDiscountPct", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>Câmbio</Label>
          <Select value={draft.transmission || "all"} onValueChange={(v) => patch("transmission", v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TRANSMISSIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Tipo de anunciante</Label>
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

        <div className="flex flex-col justify-end gap-2 pb-1.5">
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <SavedFilters />
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push(pathname)}>
            Limpar filtros
          </Button>
          <Button type="submit" size="sm">
            Buscar
          </Button>
        </div>
      </div>
    </form>
  );
}

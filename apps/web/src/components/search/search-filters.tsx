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

export function SearchFiltersForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="space-y-1">
          <Label>Marca</Label>
          <Select value={searchParams.get("brand") ?? ""} onValueChange={(v) => setParam("brand", v || null)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
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
            defaultValue={searchParams.get("model") ?? ""}
            placeholder="ex: onix"
            onBlur={(e) => setParam("model", e.target.value || null)}
          />
        </div>

        <div className="space-y-1">
          <Label>Ano mínimo</Label>
          <Input
            type="number"
            defaultValue={searchParams.get("yearMin") ?? ""}
            onBlur={(e) => setParam("yearMin", e.target.value || null)}
          />
        </div>

        <div className="space-y-1">
          <Label>Ano máximo</Label>
          <Input
            type="number"
            defaultValue={searchParams.get("yearMax") ?? ""}
            onBlur={(e) => setParam("yearMax", e.target.value || null)}
          />
        </div>

        <div className="space-y-1">
          <Label>Preço máximo (R$)</Label>
          <Input
            type="number"
            defaultValue={searchParams.get("priceMaxCents") ? Number(searchParams.get("priceMaxCents")) / 100 : ""}
            onBlur={(e) => setParam("priceMaxCents", e.target.value ? String(Number(e.target.value) * 100) : null)}
          />
        </div>

        <div className="space-y-1">
          <Label>Desconto FIPE mínimo (%)</Label>
          <Input
            type="number"
            defaultValue={searchParams.get("minFipeDiscountPct") ?? ""}
            onBlur={(e) => setParam("minFipeDiscountPct", e.target.value || null)}
          />
        </div>

        <div className="space-y-1">
          <Label>Câmbio</Label>
          <Select
            value={searchParams.get("transmission") ?? ""}
            onValueChange={(v) => setParam("transmission", v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {TRANSMISSIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2 pb-1.5">
          <Checkbox
            id="onlyActive"
            checked={searchParams.get("onlyActive") === "1"}
            onCheckedChange={(checked) => setParam("onlyActive", checked ? "1" : null)}
          />
          <Label htmlFor="onlyActive">Só anúncios ativos</Label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <SavedFilters />
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}

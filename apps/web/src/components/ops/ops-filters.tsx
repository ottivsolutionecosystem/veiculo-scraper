"use client";

import type { Operator, OpsRange } from "@veiculo/types";

import { SellerTypeFilter } from "@/components/queue/seller-type-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RANGES: { id: OpsRange; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "month", label: "Este mês" },
];

export function OpsFilters({
  range,
  from,
  to,
  operatorId,
  operators,
  onPatch,
}: {
  range: OpsRange;
  from: string;
  to: string;
  operatorId?: number;
  operators: Operator[];
  onPatch: (next: Record<string, string | undefined>) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Números da consignação. Passe o mouse no card para ver a fórmula. Telefone não entra aqui.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.id}
              size="sm"
              variant={range === r.id && !from ? "navy" : "outline"}
              onClick={() => onPatch({ range: r.id, from: undefined, to: undefined })}
            >
              {r.label}
            </Button>
          ))}
          <SellerTypeFilter />
          <Select
            value={operatorId ? String(operatorId) : "all"}
            onValueChange={(value) => onPatch({ operatorId: value === "all" ? undefined : value })}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Consignador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o time</SelectItem>
              {operators.map((op) => (
                <SelectItem key={op.id} value={String(op.id)}>
                  {op.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Intervalo</span>
        <Input
          type="date"
          value={from}
          className="w-40"
          onChange={(e) => onPatch({ from: e.target.value || undefined, to: to || e.target.value || undefined })}
        />
        <span className="text-muted-foreground">até</span>
        <Input
          type="date"
          value={to}
          className="w-40"
          onChange={(e) => onPatch({ to: e.target.value || undefined, from: from || e.target.value || undefined })}
        />
      </div>
    </>
  );
}

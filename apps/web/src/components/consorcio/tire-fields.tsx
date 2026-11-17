"use client";

import type { ConsorcioTireReport, TireCondition } from "@veiculo/types";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TIRE_LABEL } from "@/lib/consorcio/labels";

const POSITIONS: Array<{ key: keyof Omit<ConsorcioTireReport, "notes">; label: string }> = [
  { key: "frontLeft", label: "Dianteiro esquerdo" },
  { key: "frontRight", label: "Dianteiro direito" },
  { key: "rearLeft", label: "Traseiro esquerdo" },
  { key: "rearRight", label: "Traseiro direito" },
];

const OPTIONS: TireCondition[] = ["good", "fair", "poor", "unknown"];

export function TireFields({
  value,
  onChange,
}: {
  value: ConsorcioTireReport;
  onChange: (next: ConsorcioTireReport) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {POSITIONS.map((pos) => (
          <div key={pos.key} className="space-y-1.5">
            <Label>{pos.label}</Label>
            <Select
              value={value[pos.key]}
              onValueChange={(v) => onChange({ ...value, [pos.key]: v as TireCondition })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {TIRE_LABEL[o]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label>Observações dos pneus</Label>
        <Textarea
          value={value.notes ?? ""}
          onChange={(e) => onChange({ ...value, notes: e.target.value || null })}
          placeholder="Ex.: dianteiros novos, traseiros no limite"
          rows={2}
        />
      </div>
    </div>
  );
}

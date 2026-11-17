"use client";

import type { ConsorcioTireReport, TireCondition } from "@veiculo/types";
import { Textarea } from "@/components/ui/textarea";
import { TIRE_LABEL } from "@/lib/consorcio/labels";
import { cn } from "@/lib/utils";

type TireKey = keyof Omit<ConsorcioTireReport, "notes">;

const POSITIONS: Array<{ key: TireKey; short: string; side: "left" | "right"; axle: "front" | "rear" }> =
  [
    { key: "frontLeft", short: "Dianteiro\nesquerdo", side: "left", axle: "front" },
    { key: "frontRight", short: "Dianteiro\ndireito", side: "right", axle: "front" },
    { key: "rearLeft", short: "Traseiro\nesquerdo", side: "left", axle: "rear" },
    { key: "rearRight", short: "Traseiro\ndireito", side: "right", axle: "rear" },
  ];

const CHOICES: Array<{ value: TireCondition; hint: string; tone: string }> = [
  { value: "good", hint: "Banda ok", tone: "border-boa/40 bg-boa/10 text-boa data-[on=true]:border-boa data-[on=true]:bg-boa data-[on=true]:text-white" },
  { value: "fair", hint: "Metade", tone: "border-amber-500/40 bg-amber-500/10 text-amber-800 data-[on=true]:border-amber-600 data-[on=true]:bg-amber-600 data-[on=true]:text-white" },
  { value: "poor", hint: "Trocar", tone: "border-destructive/40 bg-destructive/10 text-destructive data-[on=true]:border-destructive data-[on=true]:bg-destructive data-[on=true]:text-white" },
];

export function TireFields({
  value,
  onChange,
}: {
  value: ConsorcioTireReport;
  onChange: (next: ConsorcioTireReport) => void;
}) {
  function setAll(condition: TireCondition) {
    onChange({
      ...value,
      frontLeft: condition,
      frontRight: condition,
      rearLeft: condition,
      rearRight: condition,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="w-full text-xs text-muted-foreground sm:w-auto sm:self-center">
          Atalho — marcar todos:
        </span>
        {CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setAll(c.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              c.tone,
            )}
          >
            {TIRE_LABEL[c.value]}
          </button>
        ))}
      </div>

      <div className="mx-auto grid max-w-md grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-3 sm:gap-x-3">
        <TireCorner
          position={POSITIONS[0]!}
          value={value.frontLeft}
          onPick={(next) => onChange({ ...value, frontLeft: next })}
        />
        <div className="row-span-2 flex h-full min-h-[11rem] items-center justify-center">
          <div className="relative flex h-full w-14 flex-col items-center justify-between rounded-[1.75rem] border-2 border-navy/15 bg-navy/[0.04] py-3 sm:w-16">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-navy/50">
              Frente
            </span>
            <div className="h-8 w-8 rounded-full border border-navy/10 bg-white/80" />
            <div className="h-10 w-6 rounded-md border border-navy/10 bg-white/60" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-navy/50">
              Traseira
            </span>
          </div>
        </div>
        <TireCorner
          position={POSITIONS[1]!}
          value={value.frontRight}
          onPick={(next) => onChange({ ...value, frontRight: next })}
        />
        <TireCorner
          position={POSITIONS[2]!}
          value={value.rearLeft}
          onPick={(next) => onChange({ ...value, rearLeft: next })}
        />
        <TireCorner
          position={POSITIONS[3]!}
          value={value.rearRight}
          onPick={(next) => onChange({ ...value, rearRight: next })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium leading-none">Observações dos pneus</label>
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

function TireCorner({
  position,
  value,
  onPick,
}: {
  position: (typeof POSITIONS)[number];
  value: TireCondition;
  onPick: (next: TireCondition) => void;
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border border-navy/10 bg-white p-2.5 shadow-sm",
        position.side === "right" && "text-right",
      )}
    >
      <p
        className={cn(
          "whitespace-pre-line text-xs font-semibold leading-tight text-navy",
          position.side === "right" && "text-right",
        )}
      >
        {position.short}
      </p>
      <div className="flex flex-col gap-1.5">
        {CHOICES.map((c) => {
          const on = value === c.value;
          return (
            <button
              key={c.value}
              type="button"
              data-on={on}
              onClick={() => onPick(c.value)}
              className={cn(
                "rounded-lg border px-2 py-2 text-left transition active:scale-[0.98]",
                c.tone,
                position.side === "right" && "text-right",
              )}
            >
              <span className="block text-sm font-semibold leading-none">{TIRE_LABEL[c.value]}</span>
              <span className={cn("mt-0.5 block text-[10px] opacity-80", on && "opacity-90")}>
                {c.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

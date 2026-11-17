import { Check } from "lucide-react";

import type { ConsorcioOffer } from "@veiculo/types";
import { offerChecklist, offerProgressPct } from "@/lib/consorcio/offer-rules";
import { cn } from "@/lib/utils";

export function PublicProgress({ offer }: { offer: ConsorcioOffer }) {
  const steps = offerChecklist(offer);
  const pct = offerProgressPct(offer);

  return (
    <div className="space-y-3 rounded-[1.25rem] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white">Progresso da avaliação</p>
        <p className="text-xs font-semibold tabular-nums text-coral">{pct}%</p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="auttus-gradient h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {steps.map((step) => (
          <li
            key={step.key}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-medium",
              step.done
                ? "border-boa/30 bg-boa/15 text-white"
                : "border-white/10 bg-white/[0.03] text-white/45",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                step.done ? "bg-boa text-white" : "bg-white/10",
              )}
            >
              {step.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
            </span>
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

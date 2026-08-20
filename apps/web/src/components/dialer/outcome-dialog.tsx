"use client";

import type { CallOutcome } from "@veiculo/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CALL_OUTCOME_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const POSITIVE: CallOutcome[] = ["accepted_consign", "negotiating", "thinking"];
const NEUTRAL: CallOutcome[] = ["no_answer"];
const EXIT: CallOutcome[] = ["not_interested", "wants_cash", "unrealistic_price", "wrong_number"];

function OutcomeButton({
  outcome,
  emphasis,
  onChoose,
}: {
  outcome: CallOutcome;
  emphasis: "positive" | "neutral" | "exit";
  onChoose: (outcome: CallOutcome) => void;
}) {
  return (
    <Button
      variant={emphasis === "exit" ? "outline" : emphasis === "positive" && outcome === "accepted_consign" ? "default" : "outline"}
      className={cn(
        "h-auto justify-center whitespace-normal py-3 text-center",
        outcome === "accepted_consign" && "col-span-2 rounded-xl auttus-gradient border-0 text-white hover:opacity-95",
        emphasis === "exit" && "text-navy/70",
      )}
      onClick={() => onChoose(outcome)}
    >
      {CALL_OUTCOME_LABELS[outcome]}
    </Button>
  );
}

/** Resultado obrigatório da ligação de consignação. */
export function OutcomeDialog({
  open,
  onChoose,
}: {
  open: boolean;
  onChoose: (outcome: CallOutcome) => void;
}) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Resultado da ligação</DialogTitle>
          <DialogDescription>Obrigatório — tira o carro da fila ou agenda o follow-up.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {POSITIVE.map((outcome) => (
            <OutcomeButton key={outcome} outcome={outcome} emphasis="positive" onChoose={onChoose} />
          ))}
          {NEUTRAL.map((outcome) => (
            <OutcomeButton key={outcome} outcome={outcome} emphasis="neutral" onChoose={onChoose} />
          ))}
          {EXIT.map((outcome) => (
            <OutcomeButton key={outcome} outcome={outcome} emphasis="exit" onChoose={onChoose} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

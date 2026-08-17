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

const OUTCOMES: CallOutcome[] = [
  "no_answer",
  "not_interested",
  "thinking",
  "negotiating",
  "agreed_to_bring",
  "wrong_number",
];

/** Modal de resultado obrigatório após cada ligação (seção 12 do SPEC). Não
 * há botão de fechar sem escolher — só o `onChoose`. */
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
          <DialogDescription>Obrigatório antes de seguir para o próximo veículo.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {OUTCOMES.map((outcome) => (
            <Button key={outcome} variant="outline" onClick={() => onChoose(outcome)}>
              {CALL_OUTCOME_LABELS[outcome]}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const RETURN_REASONS = [
  "Sem interesse em consignar",
  "Quer vender à vista",
  "Preço irreal",
  "Não compareceu",
  "Anúncio ou contato inválido",
  "Já vendeu",
] as const;

/** Parecer da tratativa: consignou (estoque) ou devolve à fila com a tag. */
export function ParecerDialog({
  open,
  overdue,
  reason,
  onReasonChange,
  onConsigned,
  onReturned,
  onOpenChange,
  busy,
}: {
  open: boolean;
  overdue: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConsigned: () => void;
  onReturned: () => void;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && overdue) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn("z-[60] sm:max-w-md", overdue && "[&>button]:hidden")}
        onInteractOutside={(e) => {
          if (overdue) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (overdue) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{overdue ? "Prazo vencido — parecer obrigatório" : "Resultado da consignação"}</DialogTitle>
          <DialogDescription>
            Consignou vai para o estoque e não volta à fila. Não consignou devolve o carro com a tag do motivo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            className="w-full rounded-xl auttus-gradient border-0 text-white hover:opacity-95"
            disabled={busy}
            onClick={onConsigned}
          >
            Consignou
          </Button>
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">Não consignou</p>
            <Select value={reason} onValueChange={onReasonChange}>
              <SelectTrigger>
                <SelectValue placeholder="Motivo" />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                {RETURN_REASONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full" disabled={busy || !reason} onClick={onReturned}>
              Devolver à fila com esta tag
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

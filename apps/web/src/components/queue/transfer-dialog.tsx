"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import type { Operator } from "@veiculo/types";
import { ApiError, getOperators, transferVehicle } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TransferDialog({
  open,
  onOpenChange,
  vehicleId,
  currentOperatorId,
  onTransferred,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: number;
  currentOperatorId: number;
  onTransferred: () => void;
}) {
  const [items, setItems] = React.useState<Operator[]>([]);
  const [toId, setToId] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setToId("");
    setError(null);
    void getOperators().then((res) => setItems(res.items.filter((op) => op.id !== currentOperatorId && op.active)));
  }, [open, currentOperatorId]);

  async function confirm() {
    const dest = Number(toId);
    if (!dest) return;
    setBusy(true);
    setError(null);
    try {
      await transferVehicle(vehicleId, dest);
      onOpenChange(false);
      onTransferred();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não transferiu o carro.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Passar para outra pessoa</DialogTitle>
          <DialogDescription>
            Quem receber vê o carro em Meus e pode tentar consignar. Você deixa de ser o dono do
            trabalho.
          </DialogDescription>
        </DialogHeader>
        <Select value={toId} onValueChange={setToId}>
          <SelectTrigger>
            <SelectValue placeholder="Escolher consignador" />
          </SelectTrigger>
          <SelectContent>
            {items.map((op) => (
              <SelectItem key={op.id} value={String(op.id)}>
                {op.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Cadastre outra pessoa em Equipe para transferir.</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!toId || busy} onClick={() => void confirm()}>
            {busy && <Loader2 className="animate-spin" />} Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

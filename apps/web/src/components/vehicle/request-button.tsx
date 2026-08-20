"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { BranchWithLoad } from "@/lib/api-types";
import { createRequest, ApiError } from "@/lib/api";

export function RequestButton({ vehicleId, branches }: { vehicleId: number; branches: BranchWithLoad[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [branchId, setBranchId] = React.useState("");
  const [proposedAt, setProposedAt] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (done) {
    return (
      <Button disabled variant="secondary">
        <Check /> Solicitação enviada
      </Button>
    );
  }

  async function send() {
    setSending(true);
    setError(null);
    try {
      await createRequest({
        vehicleId,
        branchId: Number(branchId),
        proposedAt: proposedAt ? new Date(proposedAt).toISOString() : new Date().toISOString(),
      });
      setDone(true);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao enviar solicitação.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="navy" onClick={() => setOpen(true)}>
        <Send /> Levar para a loja
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Levar para consignação na loja</DialogTitle>
          <DialogDescription>
            Entra no pipeline: unidade, horário combinado e o carro some da fila de ligação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Unidade</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Data e hora propostas</Label>
            <Input type="datetime-local" value={proposedAt} onChange={(e) => setProposedAt(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button disabled={!branchId || sending} onClick={send}>
            {sending && <Loader2 className="animate-spin" />} Mandar para o pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

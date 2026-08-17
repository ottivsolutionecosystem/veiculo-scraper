"use client";

import * as React from "react";
import { Send, Check } from "lucide-react";

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
import { BRANCHES } from "@/mocks/branches";

export function RequestButton() {
  const [open, setOpen] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [branchId, setBranchId] = React.useState("");

  if (done) {
    return (
      <Button disabled variant="secondary">
        <Check /> Solicitação enviada
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Send /> Solicitar na loja
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar veículo na loja</DialogTitle>
          <DialogDescription>
            Gera a mensagem pronta para o vendedor com modelo, horário e endereço da unidade
            (seção 11 do SPEC).
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
                {BRANCHES.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Data e hora propostas</Label>
            <Input type="datetime-local" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!branchId}
            onClick={() => {
              setDone(true);
              setOpen(false);
            }}
          >
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

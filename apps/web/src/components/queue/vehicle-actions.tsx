"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, ThumbsUp, XCircle, Send, Eye, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { discardVehicle, postInteraction, revealSellerContact } from "@/lib/api";

const DISCARD_REASONS = [
  "Preço fora da faixa",
  "Vendedor sem resposta",
  "Veículo já vendido",
  "Sinistro declarado",
  "Documentação irregular",
  "Duplicidade confirmada",
];

/** Ações rápidas de um veículo (Fila do dia, Busca, Discador) — chamam a
 * API real (seção 12 do SPEC). */
export function VehicleActions({ vehicleId, maskedPhone }: { vehicleId: number; maskedPhone: string }) {
  const router = useRouter();
  const [phone, setPhone] = React.useState<string | null>(null);
  const [revealing, setRevealing] = React.useState(false);
  const [interested, setInterested] = React.useState(false);
  const [savingInterest, setSavingInterest] = React.useState(false);
  const [discarded, setDiscarded] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [discarding, setDiscarding] = React.useState(false);
  const [reason, setReason] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");

  if (discarded) {
    return <span className="text-xs text-muted-foreground">Descartado: {reason}</span>;
  }

  async function reveal() {
    setRevealing(true);
    try {
      const { phone: revealed } = await revealSellerContact(vehicleId);
      setPhone(revealed);
    } catch {
      setPhone(null);
    } finally {
      setRevealing(false);
    }
  }

  async function markInterest() {
    setSavingInterest(true);
    try {
      await postInteraction(vehicleId, { channel: "phone", outcome: "negotiating" });
      setInterested(true);
    } finally {
      setSavingInterest(false);
    }
  }

  async function confirmDiscard() {
    setDiscarding(true);
    try {
      await discardVehicle(vehicleId, reason, notes || undefined);
      setDiscarded(true);
      setDiscardOpen(false);
      router.refresh();
    } finally {
      setDiscarding(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline">
            <Phone />
            Ligar
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 text-sm">
          <p className="mb-2 font-medium">{phone ?? maskedPhone}</p>
          {!phone ? (
            <Button size="sm" variant="secondary" onClick={reveal} disabled={revealing}>
              {revealing ? <Loader2 className="animate-spin" /> : <Eye />} Revelar (gera auditoria)
            </Button>
          ) : (
            <a href={`tel:${phone}`} className="text-primary underline">
              Discar agora
            </a>
          )}
        </PopoverContent>
      </Popover>

      <Button size="sm" variant="outline" asChild>
        <a href={`https://wa.me/${(phone ?? "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
          <MessageCircle />
          WhatsApp
        </a>
      </Button>

      <Button size="sm" variant={interested ? "default" : "outline"} onClick={markInterest} disabled={savingInterest || interested}>
        {savingInterest ? <Loader2 className="animate-spin" /> : <ThumbsUp />}
        {interested ? "Interessado" : "Interesse"}
      </Button>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar veículo</DialogTitle>
            <DialogDescription>Todo descarte exige motivo (seção 7.2 do SPEC).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Motivo do descarte" />
              </SelectTrigger>
              <SelectContent>
                {DISCARD_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={!reason || discarding} onClick={confirmDiscard}>
              {discarding && <Loader2 className="animate-spin" />} Confirmar descarte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button size="sm" variant="ghost" onClick={() => setDiscardOpen(true)}>
        <XCircle />
        Descartar
      </Button>

      <Button size="sm" variant="ghost" asChild>
        <a href={`/veiculos/${vehicleId}`}>
          <Send />
          Solicitar
        </a>
      </Button>
    </div>
  );
}

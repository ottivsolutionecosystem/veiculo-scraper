"use client";

import * as React from "react";
import { Phone, MessageCircle, ThumbsUp, XCircle, Send, Eye } from "lucide-react";

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
import { SETTINGS } from "@/mocks";

/** Ações rápidas de um veículo (Fila do dia e Busca). Sem backend nesta
 * fase: o estado é só local, para demonstrar o fluxo (seção 12 do SPEC). */
export function VehicleActions({ maskedPhone }: { maskedPhone: string }) {
  const [revealed, setRevealed] = React.useState(false);
  const [interested, setInterested] = React.useState(false);
  const [discarded, setDiscarded] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [reason, setReason] = React.useState<string>("");

  if (discarded) {
    return <span className="text-xs text-muted-foreground">Descartado: {reason}</span>;
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
          <p className="mb-2 font-medium">{revealed ? "(67) 99812-4471" : maskedPhone}</p>
          {!revealed ? (
            <Button size="sm" variant="secondary" onClick={() => setRevealed(true)}>
              <Eye /> Revelar (gera auditoria)
            </Button>
          ) : (
            <a href="tel:+5567998124471" className="text-primary underline">
              Discar agora
            </a>
          )}
        </PopoverContent>
      </Popover>

      <Button size="sm" variant="outline" asChild>
        <a href="https://wa.me/5567998124471" target="_blank" rel="noreferrer">
          <MessageCircle />
          WhatsApp
        </a>
      </Button>

      <Button
        size="sm"
        variant={interested ? "default" : "outline"}
        onClick={() => setInterested((v) => !v)}
      >
        <ThumbsUp />
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
                {SETTINGS.discardReasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Observações (opcional)" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!reason}
              onClick={() => {
                setDiscarded(true);
                setDiscardOpen(false);
              }}
            >
              Confirmar descarte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button size="sm" variant="ghost" onClick={() => setDiscardOpen(true)}>
        <XCircle />
        Descartar
      </Button>

      <Button size="sm" variant="ghost">
        <Send />
        Solicitar
      </Button>
    </div>
  );
}

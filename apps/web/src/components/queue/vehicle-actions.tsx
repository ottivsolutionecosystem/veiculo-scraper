"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Handshake, XCircle, Send, Loader2, MoreHorizontal, ExternalLink, ArrowRightLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, claimVehicle, discardVehicle } from "@/lib/api";
import { useOperator } from "@/lib/operator";
import { TransferDialog } from "@/components/queue/transfer-dialog";

const DISCARD_REASONS = [
  "Preço fora da faixa",
  "Vendedor sem resposta",
  "Veículo já vendido",
  "Sinistro declarado",
  "Documentação irregular",
  "Duplicidade confirmada",
];

export interface VehicleActionListing {
  brand: string | null;
  model: string | null;
  modelYear: number | null;
  priceCents: number | null;
  url?: string | null;
}

/** Ações da fila: Consignar assume o carro e abre o kanban. */
export function VehicleActions({
  vehicleId,
  listing,
  consignador,
  consignadorId,
  lockedUntil,
  mode = "queue",
}: {
  vehicleId: number;
  sellerId?: number | null;
  maskedPhone?: string;
  listing?: VehicleActionListing;
  fipeDiscountPct?: number | null;
  consignador?: string | null;
  consignadorId?: number | null;
  lockedUntil?: string | null;
  lastContactedAt?: string | null;
  mode?: "queue" | "stock" | "detail";
}) {
  const router = useRouter();
  const { operatorId, isMaster } = useOperator();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [discarded, setDiscarded] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [discarding, setDiscarding] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [transferOpen, setTransferOpen] = React.useState(false);

  const now = Date.now();
  const lockValid = Boolean(lockedUntil && new Date(lockedUntil).getTime() > now);
  const heldByOther = Boolean(consignadorId) && consignadorId !== operatorId && lockValid;
  const mine = Boolean(operatorId && consignadorId === operatorId);
  const canReassign = mine || (isMaster && Boolean(consignadorId));
  const inStock = mode === "stock";

  if (discarded) {
    return <span className="text-xs text-muted-foreground">Descartado: {reason}</span>;
  }

  function openListing() {
    const url = listing?.url;
    if (url) {
      window.open(url, "_blank", "noreferrer");
      return;
    }
    router.push(`/veiculos/${vehicleId}`);
  }

  async function consignar() {
    if (!operatorId) {
      setError("Entre com seu usuário para assumir o carro.");
      return;
    }
    if (heldByOther) {
      setError(`Em tratativa com ${consignador}. Peça a transferência se não for seguir.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await claimVehicle(vehicleId);
      router.push("/solicitacoes");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível assumir este carro.");
    } finally {
      setBusy(false);
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
    <div className="flex w-full shrink-0 flex-col items-stretch gap-1 sm:w-auto sm:items-end" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-end gap-1.5">
        {!inStock && (
          <Button size="sm" className="min-h-11 flex-1 rounded-full px-4 sm:flex-none" onClick={() => void consignar()} disabled={busy || heldByOther}>
            {busy ? <Loader2 className="animate-spin" /> : <Handshake />}
            Consignar
          </Button>
        )}
        <Button size="sm" variant="outline" className="min-h-11 rounded-full px-3" onClick={openListing}>
          <ExternalLink />
          Anúncio
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" aria-label="Mais ações">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={`/veiculos/${vehicleId}`}>
                <Send className="mr-2 h-4 w-4" />
                Ficha
              </a>
            </DropdownMenuItem>
            {canReassign && (
              <DropdownMenuItem onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Passar para outra pessoa
              </DropdownMenuItem>
            )}
            {!inStock && !heldByOther && (
              <DropdownMenuItem className="text-destructive" onClick={() => setDiscardOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Descartar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {heldByOther && (
        <p className="text-xs text-muted-foreground">Em tratativa com {consignador}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {operatorId ? (
        <TransferDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          vehicleId={vehicleId}
          currentOperatorId={operatorId}
          onTransferred={() => router.refresh()}
        />
      ) : null}

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar veículo</DialogTitle>
            <DialogDescription>Some da fila. Use o parecer no kanban se a tratativa não fechou.</DialogDescription>
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
            <Button variant="destructive" disabled={!reason || discarding} onClick={() => void confirmDiscard()}>
              {discarding && <Loader2 className="animate-spin" />} Confirmar descarte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

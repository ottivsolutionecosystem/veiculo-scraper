"use client";

import * as React from "react";
import type { AcquisitionRequest, Vehicle, Branch } from "@veiculo/types";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { primaryListing } from "@/mocks/vehicles";
import { formatDateTime } from "@/lib/format";
import { REQUEST_STATE_LABELS } from "@/lib/labels";

const CHECKLIST_LABELS: Record<keyof AcquisitionRequest["checklist"], string> = {
  document: "Documento",
  spareKey: "Chave reserva",
  manual: "Manual",
  inspection: "Vistoria",
  standardPhotos: "Fotos padronizadas",
  appraisal: "Avaliação",
};

export function RequestSheet({
  request,
  vehicle,
  branch,
  open,
  onOpenChange,
}: {
  request: AcquisitionRequest;
  vehicle: Vehicle | undefined;
  branch: Branch | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const listing = vehicle ? primaryListing(vehicle) : undefined;
  const complete = Object.values(request.checklist).every(Boolean);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {listing ? `${listing.brand} ${listing.model} ${listing.modelYear}` : "Solicitação"}
          </SheetTitle>
          <SheetDescription>
            {REQUEST_STATE_LABELS[request.state]} · {branch?.name ?? "unidade não definida"} ·{" "}
            {formatDateTime(request.proposedAt)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">
              Checklist de recepção {complete ? "— completo" : "— pendente"}
            </p>
            <div className="space-y-2">
              {(Object.keys(CHECKLIST_LABELS) as (keyof AcquisitionRequest["checklist"])[]).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox checked={request.checklist[key]} disabled />
                  <Label className="font-normal">{CHECKLIST_LABELS[key]}</Label>
                </div>
              ))}
            </div>
            {!complete && (
              <p className="mt-2 text-xs text-muted-foreground">
                Não fecha sem checklist completo (seção 11 do SPEC).
              </p>
            )}
          </div>

          {request.notes && (
            <div>
              <p className="mb-1 text-sm font-medium">Observações</p>
              <p className="text-sm text-muted-foreground">{request.notes}</p>
            </div>
          )}
          {request.lossReason && (
            <div>
              <p className="mb-1 text-sm font-medium">Motivo</p>
              <p className="text-sm text-destructive">{request.lossReason}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Responsável: {request.owner}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

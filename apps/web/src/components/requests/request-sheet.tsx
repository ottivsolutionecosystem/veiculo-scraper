"use client";

import * as React from "react";
import type { AcquisitionRequest, AcquisitionRequestState } from "@veiculo/types";
import { Loader2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { RequestListItem, BranchWithLoad } from "@/lib/api-types";
import { patchRequest, ApiError } from "@/lib/api";
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

const FORWARD_STATE: Partial<Record<AcquisitionRequestState, AcquisitionRequestState>> = {
  requested: "accepted",
  accepted: "scheduled",
  scheduled: "vehicle_at_branch",
  vehicle_at_branch: "under_evaluation",
  under_evaluation: "offer_made",
  offer_made: "closed",
};

export function RequestSheet({
  request,
  branch,
  open,
  onOpenChange,
  onChanged,
}: {
  request: RequestListItem;
  branch: BranchWithLoad | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [checklist, setChecklist] = React.useState(request.checklist);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setChecklist(request.checklist);
    setError(null);
  }, [request]);

  const complete = Object.values(checklist).every(Boolean);
  const nextState = FORWARD_STATE[request.state];

  async function toggleItem(key: keyof AcquisitionRequest["checklist"]) {
    const updated = { ...checklist, [key]: !checklist[key] };
    setChecklist(updated);
    setSaving("checklist");
    setError(null);
    try {
      await patchRequest(request.id, { checklist: updated });
      onChanged();
    } catch (err) {
      setChecklist(checklist);
      setError(err instanceof ApiError ? err.message : "Falha ao salvar checklist.");
    } finally {
      setSaving(null);
    }
  }

  async function advance(state: AcquisitionRequestState) {
    setSaving(state);
    setError(null);
    try {
      await patchRequest(request.id, { state });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao avançar estado.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {request.vehicle
              ? `${request.vehicle.brand} ${request.vehicle.model} ${request.vehicle.modelYear}`
              : "Solicitação"}
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
                  <Checkbox
                    checked={checklist[key]}
                    disabled={saving !== null || request.state === "closed" || request.state === "declined"}
                    onCheckedChange={() => toggleItem(key)}
                  />
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          {nextState && (
            <Button size="sm" disabled={saving !== null} onClick={() => advance(nextState)}>
              {saving === nextState && <Loader2 className="animate-spin" />}
              Avançar para {REQUEST_STATE_LABELS[nextState]}
            </Button>
          )}

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

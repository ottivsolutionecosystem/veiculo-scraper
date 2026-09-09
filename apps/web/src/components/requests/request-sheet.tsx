"use client";

import * as React from "react";
import type { AcquisitionRequestState } from "@veiculo/types";
import { ExternalLink, Loader2 } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RequestListItem, BranchWithLoad } from "@/lib/api-types";
import { patchRequest, postParecer, ApiError } from "@/lib/api";
import { countdownLabel, formatDateTime, toDatetimeLocalValue } from "@/lib/format";
import { REQUEST_STATE_LABELS } from "@/lib/labels";
import { isTratativaOverdue, tratativaDeadlineIso, showsVisitField, boardColumn } from "@/lib/tratativa";
import { ParecerDialog } from "@/components/requests/parecer-dialog";
import { SellerContactForm } from "@/components/requests/seller-contact-form";
import { ContactActions } from "@/components/vehicle/contact-actions";

export function RequestSheet({
  request,
  branch,
  open,
  visitHint = false,
  pendingState = null,
  onOpenChange,
  onChanged,
}: {
  request: RequestListItem;
  branch: BranchWithLoad | undefined;
  open: boolean;
  visitHint?: boolean;
  pendingState?: AcquisitionRequestState | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [saving, setSaving] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [visitLocal, setVisitLocal] = React.useState(toDatetimeLocalValue(request.proposedAt));
  const [parecerOpen, setParecerOpen] = React.useState(false);
  const [returnReason, setReturnReason] = React.useState("");

  React.useEffect(() => {
    setError(null);
    setVisitLocal(toDatetimeLocalValue(request.proposedAt));
    setReturnReason("");
  }, [request]);

  const overdue = isTratativaOverdue(request.state, request.lockedUntil, request.proposedAt);
  const deadlineIso = tratativaDeadlineIso(request.state, request.lockedUntil, request.proposedAt);
  const clock = countdownLabel(deadlineIso);
  const closed = request.state === "closed" || request.state === "declined" || request.state === "no_show";
  const preSchedule = request.state === "requested" || request.state === "accepted";
  const showVisit = !closed && showsVisitField(request.state, pendingState);
  const listingUrl = request.listingUrl;

  React.useEffect(() => {
    if (open && overdue && !closed) setParecerOpen(true);
    if (!open) setParecerOpen(false);
  }, [open, overdue, closed, request.id]);

  function openListing() {
    if (listingUrl) {
      window.open(listingUrl, "_blank", "noreferrer");
      return;
    }
    window.open(`/veiculos/${request.vehicleId}`, "_blank", "noreferrer");
  }

  async function saveVisit() {
    if (!visitLocal) {
      setError("Informe data e hora da visita à loja.");
      return;
    }
    setSaving("visita");
    setError(null);
    try {
      await patchRequest(request.id, {
        proposedAt: new Date(visitLocal).toISOString(),
        ...(pendingState ? { state: pendingState } : {}),
      });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao salvar a visita.");
    } finally {
      setSaving(null);
    }
  }

  async function submitParecer(consigned: boolean) {
    setSaving("parecer");
    setError(null);
    try {
      await postParecer(request.id, { consigned, reason: consigned ? undefined : returnReason });
      setParecerOpen(false);
      onOpenChange(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao gravar o parecer.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <Sheet
        open={open && !parecerOpen}
        onOpenChange={(next) => {
          if (!next) onOpenChange(false);
        }}
      >
        <SheetContent className="overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>
              <span className="mr-1.5 rounded-md bg-navy/[0.06] px-1.5 py-0.5 text-xs font-semibold tabular-nums text-navy/60">
                #{request.vehicleId}
              </span>
              {request.vehicle
                ? `${request.vehicle.brand} ${request.vehicle.model} ${request.vehicle.modelYear}`
                : "Solicitação"}
            </SheetTitle>
            <SheetDescription>
              {REQUEST_STATE_LABELS[boardColumn(request.state)]} · {branch?.name ?? "unidade não definida"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {!closed && overdue && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                Prazo vencido. Encerre com o parecer.
              </div>
            )}

            {!closed && preSchedule && !overdue && (
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                2h para chegar em Agendado: {clock.text}
                {deadlineIso && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    até {formatDateTime(deadlineIso)}
                  </span>
                )}
              </div>
            )}

            <Button size="sm" variant="outline" className="min-h-11 w-full" onClick={openListing}>
              <ExternalLink />
              Ir para o anúncio
            </Button>

            <ContactActions
              sellerId={request.sellerId}
              vehicleId={request.vehicleId}
              muted={request.sellerMuted}
              doNotDisturb={request.sellerDoNotDisturb}
              hasPhone={request.sellerHasPhone ?? true}
              listing={{
                brand: request.vehicle?.brand ?? null,
                model: request.vehicle?.model ?? null,
                year: request.vehicle?.modelYear ?? null,
                priceCents: request.vehicle?.priceCents ?? null,
                fipeDiscountPct: request.fipeDiscountPct ?? null,
              }}
            />

            {!closed && (
              <SellerContactForm
                vehicleId={request.vehicleId}
                currentName={request.sellerName ?? null}
                hasPhone={request.sellerHasPhone ?? false}
                onSaved={onChanged}
              />
            )}

            {showVisit && (
              <div className="space-y-2">
                <Label>Data e hora da visita à loja</Label>
                <Input type="datetime-local" value={visitLocal} onChange={(e) => setVisitLocal(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  {visitHint
                    ? "Informe a visita para entrar em Agendado."
                    : "Horário combinado com o vendedor."}
                </p>
                <Button size="sm" variant="secondary" disabled={saving !== null || !visitLocal} onClick={() => void saveVisit()}>
                  {saving === "visita" && <Loader2 className="animate-spin" />}
                  Salvar horário da visita
                </Button>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {!closed && (
              <Button size="sm" variant="outline" disabled={saving !== null} onClick={() => setParecerOpen(true)}>
                Registrar parecer
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

      <ParecerDialog
        open={parecerOpen}
        overdue={overdue && !closed}
        reason={returnReason}
        onReasonChange={setReturnReason}
        onOpenChange={setParecerOpen}
        onConsigned={() => void submitParecer(true)}
        onReturned={() => void submitParecer(false)}
        busy={saving === "parecer"}
      />
    </>
  );
}

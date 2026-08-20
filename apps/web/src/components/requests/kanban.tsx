"use client";

import * as React from "react";
import type { AcquisitionRequestState } from "@veiculo/types";

import type { RequestListItem } from "@/lib/api-types";
import { formatCents, countdownLabel, formatDateTime } from "@/lib/format";
import { REQUEST_STATE_LABELS } from "@/lib/labels";
import { KANBAN_COLUMNS, boardColumn, isTratativaOverdue, tratativaDeadlineIso } from "@/lib/tratativa";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function RequestsKanban({
  requests,
  movingId,
  onOpen,
  onMove,
}: {
  requests: RequestListItem[];
  movingId: number | null;
  onOpen: (id: number) => void;
  onMove: (request: RequestListItem, state: AcquisitionRequestState) => void;
}) {
  const skipClickRef = React.useRef(false);
  const [overState, setOverState] = React.useState<AcquisitionRequestState | null>(null);

  function dropOn(e: React.DragEvent, state: AcquisitionRequestState) {
    e.preventDefault();
    setOverState(null);
    const id = Number(e.dataTransfer.getData("text/plain"));
    const request = requests.find((item) => item.id === id);
    if (request) onMove(request, state);
  }

  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 sm:gap-4">
      {KANBAN_COLUMNS.map((state) => {
        const column = requests.filter((r) => boardColumn(r.state) === state);
        return (
          <div key={state} className="w-64 shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-navy">
                {REQUEST_STATE_LABELS[state]}
              </p>
              <span className="text-xs tabular-nums text-muted-foreground">{column.length}</span>
            </div>
            <div className="auttus-gradient h-0.5 w-8 rounded-full" />
            <div
              className={cn(
                "min-h-32 space-y-2 rounded-xl border border-dashed p-1.5 transition-colors",
                overState === state ? "border-primary bg-primary/5" : "border-transparent",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverState(state);
              }}
              onDragLeave={() => setOverState((atual) => (atual === state ? null : atual))}
              onDrop={(e) => dropOn(e, state)}
            >
              {column.map((request) => {
                const deadline = tratativaDeadlineIso(request.state, request.lockedUntil, request.proposedAt);
                const overdue = isTratativaOverdue(request.state, request.lockedUntil, request.proposedAt);
                const clock = countdownLabel(deadline);
                const consigned = boardColumn(request.state) === "closed";
                const scheduled = boardColumn(request.state) === "scheduled";
                return (
                  <Card
                    key={request.id}
                    draggable={!consigned && movingId !== request.id}
                    className={cn(
                      "p-3 transition-colors hover:ring-2 hover:ring-primary/20",
                      consigned ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
                      overdue && "border-l-[3px] border-l-destructive",
                      movingId === request.id && "opacity-50",
                    )}
                    onDragStart={(e) => {
                      if (consigned) return;
                      skipClickRef.current = true;
                      e.dataTransfer.setData("text/plain", String(request.id));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setOverState(null);
                      window.setTimeout(() => {
                        skipClickRef.current = false;
                      }, 0);
                    }}
                    onClick={() => {
                      if (skipClickRef.current) return;
                      onOpen(request.id);
                    }}
                  >
                    <p className="text-sm font-medium">
                      {request.vehicle
                        ? `${request.vehicle.brand} ${request.vehicle.model} ${request.vehicle.modelYear}`
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatCents(request.vehicle?.priceCents ?? null)}</p>
                    {!consigned && (
                      <p className={cn("text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                        {overdue
                          ? "Parecer obrigatório"
                          : scheduled && request.proposedAt
                            ? formatDateTime(request.proposedAt)
                            : clock.text}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import type { AcquisitionRequestState } from "@veiculo/types";

import type { RequestListItem } from "@/lib/api-types";
import { formatCents, countdownLabel, formatDateTime } from "@/lib/format";
import { REQUEST_STATE_LABELS } from "@/lib/labels";
import { KANBAN_COLUMNS, boardColumn, isTratativaOverdue, tratativaDeadlineIso } from "@/lib/tratativa";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

function StageSelect({
  request,
  column,
  consigned,
  movingId,
  onMove,
}: {
  request: RequestListItem;
  column: AcquisitionRequestState;
  consigned: boolean;
  movingId: number | null;
  onMove: (request: RequestListItem, state: AcquisitionRequestState) => void;
}) {
  return (
    <Select
      value={column}
      disabled={consigned || movingId === request.id}
      onValueChange={(value) => onMove(request, value as AcquisitionRequestState)}
    >
      <SelectTrigger className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {KANBAN_COLUMNS.map((state) => (
          <SelectItem key={state} value={state}>
            {REQUEST_STATE_LABELS[state]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function prazo(request: RequestListItem) {
  const overdue = isTratativaOverdue(request.state, request.lockedUntil, request.proposedAt);
  const clock = countdownLabel(tratativaDeadlineIso(request.state, request.lockedUntil, request.proposedAt));
  const scheduled = boardColumn(request.state) === "scheduled";
  if (boardColumn(request.state) === "closed") return "—";
  if (overdue) return "Parecer obrigatório";
  if (scheduled && request.proposedAt) return formatDateTime(request.proposedAt);
  return clock.text;
}

export function RequestsList({
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
  return (
    <>
      <div className="space-y-2 md:hidden">
        {requests.map((request) => {
          const column = boardColumn(request.state);
          const overdue = isTratativaOverdue(request.state, request.lockedUntil, request.proposedAt);
          const consigned = column === "closed";
          return (
            <button
              key={request.id}
              type="button"
              className={cn(
                "w-full rounded-2xl border border-navy/[0.06] bg-card p-3.5 text-left shadow-card",
                overdue && "border-l-[3px] border-l-destructive",
              )}
              onClick={() => onOpen(request.id)}
            >
              <p className="text-sm font-semibold leading-snug tracking-tight text-navy">
                {request.vehicle
                  ? `${request.vehicle.brand} ${request.vehicle.model} ${request.vehicle.modelYear}`
                  : "—"}
              </p>
              <p className="mt-1 text-sm font-medium tabular-nums text-navy/70">
                {formatCents(request.vehicle?.priceCents ?? null)}
              </p>
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <StageSelect
                  request={request}
                  column={column}
                  consigned={consigned}
                  movingId={movingId}
                  onMove={onMove}
                />
              </div>
              <p className={cn("mt-1.5 text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                {prazo(request)} · {request.owner}
              </p>
            </button>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-navy/[0.06] bg-card shadow-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead className="w-48">Estágio</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const column = boardColumn(request.state);
              const overdue = isTratativaOverdue(request.state, request.lockedUntil, request.proposedAt);
              const consigned = column === "closed";
              return (
                <TableRow key={request.id} className="cursor-pointer" onClick={() => onOpen(request.id)}>
                  <TableCell className="font-medium">
                    {request.vehicle
                      ? `${request.vehicle.brand} ${request.vehicle.model} ${request.vehicle.modelYear}`
                      : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatCents(request.vehicle?.priceCents ?? null)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <StageSelect
                      request={request}
                      column={column}
                      consigned={consigned}
                      movingId={movingId}
                      onMove={onMove}
                    />
                  </TableCell>
                  <TableCell className={cn(overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                    {prazo(request)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{request.owner}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

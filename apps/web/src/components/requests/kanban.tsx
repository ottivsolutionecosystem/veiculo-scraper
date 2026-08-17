"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AcquisitionRequestState } from "@veiculo/types";

import type { RequestListItem, BranchWithLoad } from "@/lib/api-types";
import { formatCents, formatDate } from "@/lib/format";
import { REQUEST_STATE_LABELS } from "@/lib/labels";
import { Card } from "@/components/ui/card";
import { RequestSheet } from "@/components/requests/request-sheet";

const COLUMN_ORDER: AcquisitionRequestState[] = [
  "requested",
  "accepted",
  "scheduled",
  "vehicle_at_branch",
  "under_evaluation",
  "offer_made",
  "closed",
  "declined",
  "no_show",
];

export function RequestsKanban({
  requests,
  branches,
}: {
  requests: RequestListItem[];
  branches: BranchWithLoad[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const selected = requests.find((r) => r.id === selectedId) ?? null;
  const branchMap = new Map(branches.map((b) => [b.id, b]));

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMN_ORDER.filter((state) => requests.some((r) => r.state === state)).map((state) => (
          <div key={state} className="w-64 shrink-0 space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">
              {REQUEST_STATE_LABELS[state]} ({requests.filter((r) => r.state === state).length})
            </p>
            {requests
              .filter((r) => r.state === state)
              .map((request) => (
                <Card
                  key={request.id}
                  className="cursor-pointer p-3 hover:bg-accent"
                  onClick={() => setSelectedId(request.id)}
                >
                  <p className="text-sm font-medium">
                    {request.vehicle
                      ? `${request.vehicle.brand} ${request.vehicle.model} ${request.vehicle.modelYear}`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCents(request.vehicle?.priceCents ?? null)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(request.proposedAt)}</p>
                </Card>
              ))}
          </div>
        ))}
      </div>

      <RequestSheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
        request={selected ?? requests[0]!}
        branch={selected ? branchMap.get(selected.branchId) : undefined}
        onChanged={() => router.refresh()}
      />
    </>
  );
}

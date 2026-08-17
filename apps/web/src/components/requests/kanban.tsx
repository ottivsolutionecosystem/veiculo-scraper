"use client";

import * as React from "react";
import type { AcquisitionRequest, AcquisitionRequestState, Vehicle, Branch } from "@veiculo/types";

import { primaryListing } from "@/mocks/vehicles";
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
  vehicles,
  branches,
}: {
  requests: AcquisitionRequest[];
  vehicles: Map<number, Vehicle>;
  branches: Map<string, Branch>;
}) {
  const [selected, setSelected] = React.useState<AcquisitionRequest | null>(null);

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
              .map((request) => {
                const vehicle = vehicles.get(request.vehicleId);
                const listing = vehicle ? primaryListing(vehicle) : undefined;
                return (
                  <Card
                    key={request.id}
                    className="cursor-pointer p-3 hover:bg-accent"
                    onClick={() => setSelected(request)}
                  >
                    <p className="text-sm font-medium">
                      {listing ? `${listing.brand} ${listing.model} ${listing.modelYear}` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatCents(listing?.priceCents ?? null)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(request.proposedAt)}</p>
                  </Card>
                );
              })}
          </div>
        ))}
      </div>

      <RequestSheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        request={selected ?? requests[0]!}
        vehicle={selected ? vehicles.get(selected.vehicleId) : undefined}
        branch={selected ? branches.get(selected.branchId) : undefined}
      />
    </>
  );
}

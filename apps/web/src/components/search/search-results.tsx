"use client";

import * as React from "react";
import type { Vehicle } from "@veiculo/types";

import { paginateByCursor } from "@/mocks";
import { QueueCard } from "@/components/queue/queue-card";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

/** Paginação por cursor (keyset), não por OFFSET — CLAUDE.md. Local ao
 * componente porque o resultado já vem inteiro do mock; a API real (Fase 3)
 * expõe o mesmo contrato de cursor sobre o Postgres. */
export function SearchResults({ vehicles }: { vehicles: Vehicle[] }) {
  const [shown, setShown] = React.useState<Vehicle[]>(
    () => paginateByCursor(vehicles, null, PAGE_SIZE).items,
  );

  React.useEffect(() => {
    setShown(paginateByCursor(vehicles, null, PAGE_SIZE).items);
  }, [vehicles]);

  const canLoadMore = shown.length < vehicles.length;

  function loadMore() {
    const last = shown[shown.length - 1];
    if (!last) return;
    const { items } = paginateByCursor(vehicles, String(last.id), PAGE_SIZE);
    setShown((prev) => [...prev, ...items]);
  }

  return (
    <div className="space-y-3">
      {shown.map((vehicle) => (
        <QueueCard key={vehicle.id} vehicle={vehicle} />
      ))}
      {canLoadMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore}>
            Carregar mais ({vehicles.length - shown.length} restantes)
          </Button>
        </div>
      )}
    </div>
  );
}

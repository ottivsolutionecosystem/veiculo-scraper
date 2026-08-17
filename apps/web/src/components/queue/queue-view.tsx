"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Vehicle } from "@veiculo/types";

import { QueueCard } from "@/components/queue/queue-card";

const ROW_HEIGHT = 132;
const ROW_GAP = 12;

export function QueueView({ vehicles }: { vehicles: Vehicle[] }) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: vehicles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT + ROW_GAP,
    overscan: 8,
  });

  return (
    <div ref={parentRef} className="h-[calc(100vh-11rem)] overflow-y-auto">
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const vehicle = vehicles[virtualRow.index]!;
          return (
            <div
              key={vehicle.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)`, paddingBottom: ROW_GAP }}
            >
              <QueueCard vehicle={vehicle} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

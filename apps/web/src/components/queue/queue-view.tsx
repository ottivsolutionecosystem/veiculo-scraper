"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";

import type { Page, QueueItem } from "@/lib/api-types";
import type { SearchFilters } from "@/lib/search";
import type { QueueListFilters } from "@/lib/queue-filters";
import { getQueue, searchVehicles, type QueueScope } from "@/lib/api";
import { useOperator } from "@/lib/operator";
import { useChromeVisibility } from "@/components/layout/chrome-visibility";
import { QueueCard } from "@/components/queue/queue-card";

const ROW_HEIGHT = 132;
const ROW_GAP = 12;

/** Lista virtualizada com "carregar mais" por scroll — cursor do backend,
 * nunca OFFSET (CLAUDE.md). `source`/`filters` são serializáveis (não uma
 * função) porque este componente cliente recebe props de um Server
 * Component e o Next.js não permite passar funções pela fronteira RSC. */
export function QueueView({
  initial,
  source,
  filters,
  sellerType,
  scope,
  listFilters,
  fill = false,
}: {
  initial: Page<QueueItem>;
  source: "queue" | "search";
  filters?: SearchFilters;
  sellerType?: "individual" | "dealer";
  scope?: QueueScope;
  listFilters?: QueueListFilters;
  fill?: boolean;
}) {
  const { operatorId } = useOperator();
  const { onScrollFrame } = useChromeVisibility();
  const [items, setItems] = React.useState(initial.items);
  const [cursor, setCursor] = React.useState(initial.nextCursor);
  const [loading, setLoading] = React.useState(false);
  const parentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setItems(initial.items);
    setCursor(initial.nextCursor);
  }, [initial]);

  const listKey = JSON.stringify(listFilters ?? {});

  React.useEffect(() => {
    if (source !== "queue" || !operatorId) return;
    let cancelled = false;
    void getQueue({ limit: 40, sellerType, scope, ...listFilters }).then((page) => {
      if (cancelled) return;
      setItems(page.items);
      setCursor(page.nextCursor);
    });
    return () => {
      cancelled = true;
    };
    // listKey serializa os filtros; listFilters entra pelo spread acima
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, scope, operatorId, sellerType, listKey]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () =>
      (typeof window !== "undefined" && window.innerWidth < 640 ? 260 : ROW_HEIGHT) + ROW_GAP,
    overscan: 8,
  });

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const page =
        source === "queue"
          ? await getQueue({ cursor, limit: 40, sellerType, scope, ...listFilters })
          : await searchVehicles({ ...filters, cursor, limit: 30 });
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    onScrollFrame(el);
    if (el.scrollHeight - el.scrollTop - el.clientHeight < ROW_HEIGHT * 4) {
      void loadMore();
    }
  }

  return (
    <div
      ref={parentRef}
      onScroll={onScroll}
      className={
        fill
          ? "h-full min-h-0 overflow-y-auto overscroll-y-contain"
          : "max-h-[70dvh] min-h-[16rem] overflow-y-auto overscroll-y-contain"
      }
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]!;
          return (
            <div
              key={item.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)`, paddingBottom: ROW_GAP }}
            >
              <QueueCard item={item} mode={source === "search" ? "stock" : "queue"} />
            </div>
          );
        })}
      </div>
      {loading && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando mais…
        </div>
      )}
    </div>
  );
}

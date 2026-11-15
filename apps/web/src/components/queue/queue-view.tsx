"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";

import type { Page, QueueItem } from "@/lib/api-types";
import type { SearchFilters } from "@/lib/search";
import type { QueueListFilters } from "@/lib/queue-filters";
import { getQueue, searchVehicles, type QueueScope } from "@/lib/api";
import { useOperator } from "@/lib/operator";
import { QueueCard } from "@/components/queue/queue-card";
import { reduceHideOnScroll } from "@/lib/hide-on-scroll";
import { cn } from "@/lib/utils";

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
  stickyChrome,
  hideChromeOnScroll = false,
}: {
  initial: Page<QueueItem>;
  source: "queue" | "search";
  filters?: SearchFilters;
  sellerType?: "individual" | "dealer";
  scope?: QueueScope;
  listFilters?: QueueListFilters;
  fill?: boolean;
  /** Cabeçalho sticky dentro do mesmo scroll — some sem mudar o flex externo. */
  stickyChrome?: React.ReactNode;
  /** Só esconde o sticky quando a lista é longa o bastante. */
  hideChromeOnScroll?: boolean;
}) {
  const { operatorId } = useOperator();
  const [items, setItems] = React.useState(initial.items);
  const [cursor, setCursor] = React.useState(initial.nextCursor);
  const [loading, setLoading] = React.useState(false);
  const [chromeHidden, setChromeHidden] = React.useState(false);
  const parentRef = React.useRef<HTMLDivElement>(null);
  const lastTop = React.useRef(0);
  const accumulated = React.useRef(0);
  const chromeHiddenRef = React.useRef(false);

  React.useEffect(() => {
    setItems(initial.items);
    setCursor(initial.nextCursor);
    setChromeHidden(false);
    chromeHiddenRef.current = false;
    accumulated.current = 0;
    lastTop.current = 0;
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
    const scrollTop = el.scrollTop;
    const delta = scrollTop - lastTop.current;
    lastTop.current = scrollTop;

    if (hideChromeOnScroll && stickyChrome) {
      const overflow = el.scrollHeight - el.clientHeight;
      const next = reduceHideOnScroll(
        { hidden: chromeHiddenRef.current, accumulated: accumulated.current },
        { scrollTop, delta, overflow },
      );
      accumulated.current = next.accumulated;
      if (next.hidden !== chromeHiddenRef.current) {
        chromeHiddenRef.current = next.hidden;
        setChromeHidden(next.hidden);
      }
    }

    if (el.scrollHeight - el.scrollTop - el.clientHeight < ROW_HEIGHT * 4) {
      void loadMore();
    }
  }

  // Busca com poucos itens: sem caixa de scroll aninhada — a página sobe/desce.
  const nestedScroll = fill || items.length >= 6;

  return (
    <div
      ref={parentRef}
      onScroll={onScroll}
      className={
        fill
          ? "h-full min-h-0 overflow-y-auto overscroll-y-contain"
          : nestedScroll
            ? "max-h-[70dvh] min-h-[16rem] overflow-y-auto overscroll-y-contain"
            : "overflow-visible"
      }
    >
      {stickyChrome && (
        <div
          className={cn(
            "sticky top-0 z-20 bg-card transition-transform duration-300 ease-out will-change-transform",
            chromeHidden && "pointer-events-none -translate-y-full",
          )}
        >
          {stickyChrome}
        </div>
      )}
      <div
        className={cn("relative w-full", fill && "px-3 pb-3 sm:px-6")}
        style={{ height: virtualizer.getTotalSize() }}
      >
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

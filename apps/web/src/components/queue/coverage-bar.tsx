"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { QueueStats } from "@/lib/api";
import { getQueueStats } from "@/lib/api";
import { useOperator } from "@/lib/operator";
import { cn } from "@/lib/utils";

const METRICS = [
  { value: "untouched", label: "Livres", key: "untouched" as const },
  { value: "tagged", label: "Com tag", key: "tagged" as const },
  { value: "price_drop", label: "Caiu de preço", key: "priceDrop" as const },
] as const;

export function CoverageBar({
  initial,
  sellerType,
}: {
  initial: QueueStats;
  sellerType?: "individual" | "dealer";
}) {
  const { operatorId, isMaster } = useOperator();
  const [stats, setStats] = useState(initial);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope") ?? "untouched";

  useEffect(() => {
    setStats(initial);
  }, [initial]);

  useEffect(() => {
    void getQueueStats({ sellerType }).then(setStats);
  }, [operatorId, sellerType]);

  function go(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex gap-1.5 md:hidden">
        {METRICS.map((metric) => {
          const active = scope === metric.value;
          return (
            <button
              key={metric.value}
              type="button"
              onClick={() => go(metric.value)}
              className={cn(
                "min-h-11 flex-1 rounded-2xl border px-2 py-1.5 text-center transition-colors",
                active
                  ? "border-primary/40 bg-primary/[0.08] text-navy shadow-card"
                  : "border-navy/[0.07] bg-card text-navy/70",
              )}
            >
              <span
                className={cn(
                  "block text-[10px] font-medium uppercase tracking-[0.08em]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {metric.label}
              </span>
              <span className="text-sm font-semibold tabular-nums">{stats[metric.key]}</span>
            </button>
          );
        })}
      </div>

      <div className="hidden grid-cols-3 gap-2 md:grid">
        {METRICS.map((metric) => {
          const active = scope === metric.value;
          return (
            <button
              key={metric.value}
              type="button"
              onClick={() => go(metric.value)}
              className={cn(
                "card-lift relative overflow-hidden rounded-2xl border bg-card px-3 py-3 text-left shadow-card sm:px-4 sm:py-3.5",
                active ? "border-primary/35" : "border-navy/[0.06]",
              )}
            >
              {active && <span aria-hidden className="auttus-gradient absolute inset-x-0 top-0 h-0.5" />}
              <p
                className={cn(
                  "text-[11px] font-medium uppercase tracking-[0.1em]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {metric.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.75rem]",
                  active ? "text-navy" : "text-navy/70",
                )}
              >
                {stats[metric.key]}
              </p>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {isMaster ? (
          <button
            type="button"
            onClick={() => go("all")}
            className={cn(
              "text-xs font-medium",
              scope === "all" ? "text-primary" : "text-muted-foreground hover:text-navy",
            )}
          >
            {stats.online} no ar — ver todos os livres
          </button>
        ) : (
          <p className="hidden text-xs text-muted-foreground md:block">
            Livres no mercado. O que você assumiu está no kanban.
          </p>
        )}
        {isMaster && stats.ranking.length > 0 && (
          <p className="hidden text-xs text-muted-foreground md:block">
            Time hoje:{" "}
            {stats.ranking.map((r, i) => (
              <span key={r.operator}>
                {i > 0 ? " · " : ""}
                <span className="font-medium text-navy">{r.operator}</span> {r.contactedToday}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}

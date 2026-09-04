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
                "min-h-11 flex-1 rounded-full border px-2 py-1 text-center",
                active ? "border-primary bg-primary/10 text-navy" : "border-navy/10 bg-card text-navy/70",
              )}
            >
              <span className="block text-[10px] font-medium text-muted-foreground">{metric.label}</span>
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
                "rounded-xl border bg-card px-3 py-2.5 text-left shadow-card transition-all sm:px-4 sm:py-3",
                active
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-navy/10",
              )}
            >
              <p className="text-[11px] font-medium text-muted-foreground">{metric.label}</p>
              <p className={cn("mt-0.5 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl", active ? "text-navy" : "text-navy/70")}>
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

"use client";

import type { ReactNode } from "react";

import { Topbar } from "@/components/layout/topbar";
import { PageFade } from "@/components/layout/page-fade";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useChromeVisibility } from "@/components/layout/chrome-visibility";
import { cn } from "@/lib/utils";

/** Coluna do dashboard. A faixa de cima é a safe area — o relógio não come a UI. */
export function DashboardShell({ children }: { children: ReactNode }) {
  const { hidden, onScrollFrame } = useChromeVisibility();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className={cn(
          "shrink-0 overflow-hidden bg-card transition-[height] duration-300 ease-out md:hidden",
        )}
        style={{ height: hidden ? 0 : "var(--safe-top)" }}
        aria-hidden
      />
      <Topbar />
      <main
        onScroll={(e) => onScrollFrame(e.currentTarget)}
        className="app-canvas min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <PageFade>{children}</PageFade>
      </main>
      <BottomNav />
    </div>
  );
}

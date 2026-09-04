"use client";

import type { ReactNode } from "react";

import { Topbar } from "@/components/layout/topbar";
import { PageFade } from "@/components/layout/page-fade";
import { useChromeVisibility } from "@/components/layout/chrome-visibility";

/** Coluna do dashboard. A faixa de cima é a safe area — o relógio não come a UI. */
export function DashboardShell({ children }: { children: ReactNode }) {
  const { onScrollFrame } = useChromeVisibility();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 bg-card md:hidden" style={{ height: "var(--safe-top)" }} aria-hidden />
      <Topbar />
      <main
        onScroll={(e) => onScrollFrame(e.currentTarget)}
        className="app-canvas min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-[var(--bottom-nav-space)]"
      >
        <PageFade>{children}</PageFade>
      </main>
    </div>
  );
}

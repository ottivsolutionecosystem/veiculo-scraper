"use client";

import type { ReactNode } from "react";

import { Topbar } from "@/components/layout/topbar";
import { useChromeVisibility } from "@/components/layout/chrome-visibility";

/** Coluna do dashboard: topbar some no mobile ao descer, main reporta o scroll. */
export function DashboardShell({ children }: { children: ReactNode }) {
  const { hidden, onScrollFrame } = useChromeVisibility();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {hidden ? (
        <div
          className="shrink-0 bg-card/80 md:hidden"
          style={{ height: "env(safe-area-inset-top)" }}
          aria-hidden
        />
      ) : null}
      <Topbar />
      <main
        onScroll={(e) => onScrollFrame(e.currentTarget)}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-[env(safe-area-inset-bottom)]"
      >
        {children}
      </main>
    </div>
  );
}

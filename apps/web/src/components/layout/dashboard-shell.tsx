"use client";

import type { ReactNode } from "react";

import { Topbar } from "@/components/layout/topbar";
import { PageFade } from "@/components/layout/page-fade";
import { BottomNav } from "@/components/layout/bottom-nav";

/** Coluna do dashboard. A faixa de cima é a safe area — o relógio não come a UI.
 * Topbar/bottomnav ficam no fluxo (sem hide-on-scroll global): esconder eles
 * encolhia o main, zeram o scroll e virava loop — sobretudo na busca curta.
 * Hide-on-scroll fica só no sticky da fila (`QueueView`). */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 bg-card md:hidden" style={{ height: "var(--safe-top)" }} aria-hidden />
      <Topbar />
      <main className="app-canvas min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <PageFade>{children}</PageFade>
      </main>
      <BottomNav />
    </div>
  );
}

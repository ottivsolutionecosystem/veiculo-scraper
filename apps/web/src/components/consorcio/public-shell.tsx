import type { ReactNode } from "react";

import { EntrarAtmosphere } from "@/components/auth/entrar-atmosphere";
import { AuttusWordmark } from "@/components/brand/auttus-mark";

/** Casca visual do link público — mesma linguagem do entrar Auttus. */
export function PublicShell({
  children,
  eyebrow = "Avaliação remota",
  title,
  subtitle,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div data-avaliacao className="relative min-h-dvh overflow-x-hidden bg-navy-deep text-foreground">
      <EntrarAtmosphere />
      <div
        className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-10 sm:px-6"
        style={{
          paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))",
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header className="space-y-5 pb-6 pt-2">
          <AuttusWordmark onDark />
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-coral">
              {eyebrow}
            </p>
            <h1 className="max-w-xl text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="max-w-lg text-sm leading-relaxed text-white/55 sm:text-base">{subtitle}</p>
            ) : null}
          </div>
          <div className="auttus-gradient h-px w-16" />
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-8 text-center text-[11px] tracking-wide text-white/30">
          Auttus · consignação inteligente
        </footer>
      </div>
    </div>
  );
}

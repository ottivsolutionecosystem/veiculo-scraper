import type { LucideIcon } from "lucide-react";

import { AuttusMark } from "@/components/brand/auttus-mark";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-navy/12 bg-card/60 px-8 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(24rem_10rem_at_50%_0%,hsl(var(--orange)/0.07),transparent_70%)]"
      />
      <div className="relative flex flex-col items-center justify-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-navy/[0.07] bg-card shadow-card">
          {Icon ? <Icon className="h-6 w-6 text-navy/35" /> : <AuttusMark className="h-7 w-7" />}
        </span>
        <p className="text-base font-semibold tracking-tight text-navy">{title}</p>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

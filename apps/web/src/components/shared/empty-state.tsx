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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-navy/15 bg-card/50 px-8 py-16 text-center">
      {Icon ? <Icon className="h-8 w-8 text-navy/35" /> : <AuttusMark className="h-10 w-10" />}
      <p className="font-semibold text-navy">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

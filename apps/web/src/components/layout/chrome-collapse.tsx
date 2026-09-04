"use client";

import type { ReactNode } from "react";

import { useChromeVisibility } from "@/components/layout/chrome-visibility";
import { cn } from "@/lib/utils";

/** Some o chrome no mobile sem animar altura — anima height na lista virtualizada trava. */
export function ChromeCollapse({ children, className }: { children: ReactNode; className?: string }) {
  const { hidden } = useChromeVisibility();

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden",
        hidden && "max-md:h-0 max-md:min-h-0 max-md:pointer-events-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

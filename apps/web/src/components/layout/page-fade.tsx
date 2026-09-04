"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Fade curto só na troca de rota, não nos query params da fila. */
export function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="h-full min-h-0 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
      {children}
    </div>
  );
}

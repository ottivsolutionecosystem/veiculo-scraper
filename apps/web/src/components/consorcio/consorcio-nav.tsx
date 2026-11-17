"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CONSORCIO_NAV, CONSORCIO_NOVO_HREF } from "@/lib/consorcio/nav";
import { cn } from "@/lib/utils";

/** Barra fixa do módulo consórcio — abas sempre visíveis. */
export function ConsorcioNav() {
  const pathname = usePathname() ?? "";

  return (
    <div className="sticky top-0 z-20 border-b border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
        <nav
          aria-label="Consórcio"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {CONSORCIO_NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-navy text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Button asChild size="sm" className="shrink-0 rounded-full">
          <Link href={CONSORCIO_NOVO_HREF}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

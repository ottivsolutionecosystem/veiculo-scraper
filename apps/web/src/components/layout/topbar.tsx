"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Car } from "lucide-react";

import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DemoToolbar } from "@/components/shared/demo-toolbar";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Topbar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const current = NAV_ITEMS.find((item) => isActive(pathname, item.href));

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-card px-4 md:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <div className="flex h-14 items-center gap-2 border-b px-5">
            <Car className="h-5 w-5" />
            <span className="text-sm font-semibold">Captação de Veículos</span>
          </div>
          <nav className="space-y-0.5 p-3">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
      <h2 className="text-sm font-medium text-muted-foreground">{current?.label ?? ""}</h2>
      <React.Suspense fallback={null}>
        <DemoToolbar />
      </React.Suspense>
    </header>
  );
}

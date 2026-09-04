"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { AuttusWordmark } from "@/components/brand/auttus-mark";
import { BackToList } from "@/components/layout/back-to-list";
import { useChromeVisibility } from "@/components/layout/chrome-visibility";
import { OperatorBar } from "@/components/queue/operator-bar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useOperator } from "@/lib/operator";
import { NAV_GROUPS, NAV_ITEMS, navGroupsFor, type NavGroup } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MobileNav({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div>
      <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
        {group.title}
      </p>
      <div className="space-y-0.5">
        {group.items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-300 active:scale-[0.99]",
                active ? "bg-navy-deep text-white" : "text-white/55 hover:bg-white/5 hover:text-white",
              )}
            >
              {active && <span className="auttus-gradient absolute inset-y-1.5 left-0 w-[3px] rounded-full" />}
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const { isMaster } = useOperator();
  const { lockChrome } = useChromeVisibility();
  const [open, setOpen] = React.useState(false);
  const groups = navGroupsFor(isMaster);
  const items = groups.flatMap((g) => g.items);
  const current = items.find((item) => isActive(pathname, item.href)) ?? NAV_ITEMS.find((item) => isActive(pathname, item.href));
  const group = groups.find((g) => g.items.some((i) => i.href === current?.href)) ?? NAV_GROUPS.find((g) => g.items.some((i) => i.href === current?.href));

  React.useEffect(() => {
    lockChrome("topbar-menu", open);
    return () => lockChrome("topbar-menu", false);
  }, [open, lockChrome]);

  return (
    <header className="flex min-h-14 shrink-0 items-center gap-2 border-b bg-card/80 px-3 py-1.5 backdrop-blur-md sm:gap-3 sm:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          hideClose
          side="left"
          className="flex w-[min(20rem,100vw)] flex-col border-0 bg-navy px-0 py-0 text-white"
        >
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <div className="shrink-0 bg-navy" style={{ height: "var(--safe-top)" }} aria-hidden />
          <div className="flex h-[4.25rem] shrink-0 items-center justify-between gap-2 px-3 pl-5">
            <AuttusWordmark onDark />
            <SheetClose className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white/55 transition-colors duration-300 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-0">
              <X className="h-5 w-5" />
              <span className="sr-only">Fechar</span>
            </SheetClose>
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-3 pb-[var(--safe-bottom)]">
            {groups.map((g) => (
              <MobileNav key={g.title} group={g} pathname={pathname} onNavigate={() => setOpen(false)} />
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        {pathname.startsWith("/veiculos/") ? (
          <div className="flex items-center gap-1">
            <BackToList />
            <h2 className="hidden truncate text-sm font-semibold text-navy sm:block">Ficha do veículo</h2>
          </div>
        ) : (
          <>
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {group?.title ?? "Operação"}
            </p>
            <h2 className="truncate text-sm font-semibold text-navy">{current?.label ?? ""}</h2>
          </>
        )}
      </div>
      <OperatorBar compact />
    </header>
  );
}

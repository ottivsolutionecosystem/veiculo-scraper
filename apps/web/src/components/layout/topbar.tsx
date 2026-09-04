"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { AuttusWordmark } from "@/components/brand/auttus-mark";
import { BackToList } from "@/components/layout/back-to-list";
import { useChromeVisibility } from "@/components/layout/chrome-visibility";
import { OperatorBar } from "@/components/queue/operator-bar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
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
                "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
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
  const { hidden, lockChrome } = useChromeVisibility();
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
    <div
      className={cn(
        "grid shrink-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none md:!grid-rows-[1fr]",
        hidden ? "max-md:grid-rows-[0fr]" : "grid-rows-[1fr]",
      )}
    >
      <div className={cn("overflow-hidden", hidden && "max-md:pointer-events-none")}>
        <header className="flex min-h-14 items-center gap-2 border-b bg-card/80 px-3 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] backdrop-blur-md sm:gap-3 sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(20rem,100vw)] border-0 bg-navy p-0 text-white [&>button]:text-white">
              <SheetTitle className="sr-only">Navegação</SheetTitle>
              <div className="auttus-gradient h-[3px] w-full" />
              <div className="flex h-[4.25rem] items-center px-5">
                <AuttusWordmark onDark />
              </div>
              <nav className="flex max-h-[calc(100dvh-5rem)] flex-col gap-6 overflow-y-auto p-3">
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
      </div>
    </div>
  );
}

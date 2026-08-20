"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuttusWordmark } from "@/components/brand/auttus-mark";
import { useOperator } from "@/lib/operator";
import { navGroupsFor, type NavGroup } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavSection({ group, pathname }: { group: NavGroup; pathname: string }) {
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
              className={cn(
                "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-navy-deep text-white"
                  : "text-white/55 hover:bg-white/5 hover:text-white/90",
              )}
            >
              {active && (
                <span className="auttus-gradient absolute inset-y-1.5 left-0 w-[3px] rounded-full" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isMaster } = useOperator();
  const groups = navGroupsFor(isMaster);
  const top = groups.filter((g) => !g.pinBottom);
  const bottom = groups.filter((g) => g.pinBottom);

  return (
    <aside className="hidden w-[17.5rem] shrink-0 flex-col bg-navy md:flex">
      <div className="auttus-gradient h-[3px] w-full" />
      <div className="flex h-[4.25rem] items-center px-5">
        <AuttusWordmark onDark />
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4 pt-2">
        <div className="flex-1 space-y-6">
          {top.map((group) => (
            <NavSection key={group.title} group={group} pathname={pathname} />
          ))}
        </div>
        {bottom.map((group) => (
          <NavSection key={group.title} group={group} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}

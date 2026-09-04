"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Atalhos do dia no polegar — só no telefone. Desktop continua com a sidebar. */
export function BottomNav() {
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    PRIMARY_NAV.findIndex((item) => isActive(pathname, item.href)),
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="relative grid grid-cols-3">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 w-1/3 px-1 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        >
          <span className="block h-full rounded-lg bg-primary/10" />
        </span>
        {PRIMARY_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative z-10">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 px-2 py-2 text-[11px] font-medium transition-colors duration-300 active:scale-[0.99]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.shortLabel ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

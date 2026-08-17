"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: "Normal" },
  { value: "empty", label: "Vazio" },
  { value: "loading", label: "Carregando" },
  { value: "error", label: "Erro" },
];

/**
 * Alterna o estado de demonstração da tela atual (vazio / loading / erro),
 * exigido pela seção 17 do SPEC. Não existe backend nesta fase — isso só
 * troca `?demo=` na URL da própria rota.
 */
export function DemoToolbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("demo");

  return (
    <div className="ml-auto flex items-center gap-1 rounded-md border bg-muted/40 p-0.5 text-xs">
      {OPTIONS.map((option) => {
        const params = new URLSearchParams(searchParams.toString());
        if (option.value) params.set("demo", option.value);
        else params.delete("demo");
        const query = params.toString();
        const href = query ? `${pathname}?${query}` : pathname;
        const active = current === option.value;
        return (
          <Link
            key={option.label}
            href={href}
            className={cn(
              "rounded px-2 py-1 font-medium transition-colors",
              active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function OperatorBar({ compact = false }: { compact?: boolean }) {
  const { operator, logout } = useAuth();
  const router = useRouter();

  if (!operator) return null;

  async function sair() {
    await logout();
    router.replace("/entrar");
  }

  return (
    <div className={cn("flex items-center gap-1.5", compact && "rounded-full border bg-muted/60 py-0.5 pl-0.5 pr-1")}>
      <span className="flex h-7 w-7 items-center justify-center rounded-full auttus-gradient text-[10px] font-semibold text-white">
        {initials(operator.name)}
      </span>
      <span className="hidden max-w-[9rem] truncate text-sm font-medium text-navy sm:inline">{operator.name}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full"
        onClick={() => void sair()}
        aria-label="Sair"
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

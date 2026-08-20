"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { operator, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !operator) router.replace("/entrar");
  }, [ready, operator, router]);

  if (!ready || !operator) {
    return (
      <div className="flex h-dvh items-center justify-center bg-navy text-white">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

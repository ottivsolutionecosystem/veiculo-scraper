"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { useOperator } from "@/lib/operator";

export function RequireMaster({ children }: { children: React.ReactNode }) {
  const { ready, operator } = useAuth();
  const { isMaster } = useOperator();
  const router = useRouter();

  useEffect(() => {
    if (ready && operator && !isMaster) router.replace("/");
  }, [ready, operator, isMaster, router]);

  if (!ready || !isMaster) return null;
  return <>{children}</>;
}

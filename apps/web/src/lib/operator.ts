"use client";

import { useAuth } from "@/components/auth/auth-provider";

/** Identidade do consignador logado. Sem sessão, nome e id ficam vazios. */
export function useOperator() {
  const { operator } = useAuth();
  return {
    operator: operator?.name ?? "",
    operatorId: operator?.id ?? null,
    isMaster: operator?.role === "master" || operator?.login?.toLowerCase() === "guilherme.sanches",
  };
}

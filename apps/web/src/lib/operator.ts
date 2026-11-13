"use client";

import type { Operator } from "@veiculo/types";

import { useAuth } from "@/components/auth/auth-provider";

export function isMaster(operator: Operator | null | undefined): boolean {
  return operator?.role === "master" || operator?.login?.toLowerCase() === "guilherme.sanches";
}

/** Identidade do consignador logado. Sem sessão, nome e id ficam vazios. */
export function useOperator() {
  const { operator } = useAuth();
  return {
    operator: operator?.name ?? "",
    operatorId: operator?.id ?? null,
    isMaster: isMaster(operator),
  };
}

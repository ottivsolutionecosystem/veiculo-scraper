import type { Branch } from "@veiculo/types";

export const BRANCHES: Branch[] = [
  { id: "branch-1", name: "Loja Campo Grande — Matriz", address: "Av. Afonso Pena, 4200 — Campo Grande/MS", intakeLimitPerPeriod: 4 },
  { id: "branch-2", name: "Loja Dourados", address: "Av. Weimar Gonçalves Torres, 1800 — Dourados/MS", intakeLimitPerPeriod: 2 },
  { id: "branch-3", name: "Loja Três Lagoas", address: "Av. Capitão Olinto Mancini, 950 — Três Lagoas/MS", intakeLimitPerPeriod: 2 },
];

export function branchById(id: string): Branch | undefined {
  return BRANCHES.find((b) => b.id === id);
}

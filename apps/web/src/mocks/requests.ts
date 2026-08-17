import type { AcquisitionRequest, AcquisitionRequestState, IntakeChecklist } from "@veiculo/types";
import { vehicleById } from "./vehicles";
import { BRANCHES } from "./branches";

const EMPTY_CHECKLIST: IntakeChecklist = {
  document: false,
  spareKey: false,
  manual: false,
  inspection: false,
  standardPhotos: false,
  appraisal: false,
};

const FULL_CHECKLIST: IntakeChecklist = {
  document: true,
  spareKey: true,
  manual: true,
  inspection: true,
  standardPhotos: true,
  appraisal: true,
};

interface Spec {
  id: string;
  vehicleId: number;
  branchId: string;
  customerId: string | null;
  owner: string;
  state: AcquisitionRequestState;
  daysAgo: number;
  checklist: IntakeChecklist;
  lossReason?: string | null;
  notes?: string | null;
}

const isoDaysAgo = (n: number) => new Date(Date.UTC(2026, 7, 17 - n, 10, 0)).toISOString();

const SPECS: Spec[] = [
  { id: "req-1", vehicleId: 4, branchId: "branch-1", customerId: "customer-7", owner: "Ana Ferreira", state: "requested", daysAgo: 1, checklist: EMPTY_CHECKLIST },
  { id: "req-2", vehicleId: 11, branchId: "branch-1", customerId: "customer-1", owner: "Bruno Castro", state: "accepted", daysAgo: 2, checklist: EMPTY_CHECKLIST },
  { id: "req-3", vehicleId: 21, branchId: "branch-2", customerId: null, owner: "Camila Duarte", state: "scheduled", daysAgo: 3, checklist: EMPTY_CHECKLIST, notes: "Vendedor confirmou disponibilidade para quinta de manhã." },
  { id: "req-4", vehicleId: 15, branchId: "branch-1", customerId: "customer-3", owner: "Ana Ferreira", state: "vehicle_at_branch", daysAgo: 5, checklist: { ...EMPTY_CHECKLIST, document: true, spareKey: true } },
  { id: "req-5", vehicleId: 18, branchId: "branch-3", customerId: null, owner: "Bruno Castro", state: "under_evaluation", daysAgo: 6, checklist: { ...FULL_CHECKLIST, appraisal: false } },
  { id: "req-6", vehicleId: 25, branchId: "branch-1", customerId: "customer-9", owner: "Camila Duarte", state: "offer_made", daysAgo: 8, checklist: FULL_CHECKLIST, notes: "Proposta de R$ 500 abaixo do pedido, aguardando retorno." },
  { id: "req-7", vehicleId: 30, branchId: "branch-2", customerId: "customer-5", owner: "Ana Ferreira", state: "closed", daysAgo: 14, checklist: FULL_CHECKLIST },
  { id: "req-8", vehicleId: 35, branchId: "branch-1", customerId: null, owner: "Bruno Castro", state: "no_show", daysAgo: 4, checklist: EMPTY_CHECKLIST, lossReason: "Vendedor não atendeu no horário combinado" },
];

export const REQUESTS: AcquisitionRequest[] = SPECS.map((spec) => {
  const vehicle = vehicleById(spec.vehicleId);
  return {
    id: spec.id,
    vehicleId: spec.vehicleId,
    sellerId: vehicle?.sellerId ?? "seller-1",
    customerId: spec.customerId,
    branchId: spec.branchId,
    owner: spec.owner,
    proposedAt: isoDaysAgo(spec.daysAgo - 1),
    state: spec.state,
    lossReason: spec.lossReason ?? null,
    notes: spec.notes ?? null,
    checklist: spec.checklist,
    createdAt: isoDaysAgo(spec.daysAgo),
  };
});

export function requestsByState(state: AcquisitionRequestState): AcquisitionRequest[] {
  return REQUESTS.filter((r) => r.state === state);
}

export { BRANCHES };

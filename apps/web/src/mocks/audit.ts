import type { AuditRecord } from "@veiculo/types";

const isoDaysAgo = (n: number, h = 9) => new Date(Date.UTC(2026, 7, 17 - n, h)).toISOString();

export const AUDIT_RECORDS: AuditRecord[] = [
  { id: "audit-1", action: "reveal_contact", author: "Ana Ferreira", targetType: "seller", targetId: "seller-4", detail: "Revelou telefone para tratar da solicitação req-1.", createdAt: isoDaysAgo(1) },
  { id: "audit-2", action: "discard", author: "Bruno Castro", targetType: "vehicle", targetId: "9", detail: "Descartado: Preço fora da faixa.", createdAt: isoDaysAgo(2) },
  { id: "audit-3", action: "change_weight", author: "Camila Duarte", targetType: "settings", targetId: "internal_demand", detail: "Peso de Demanda interna alterado de 0.18 para 0.22.", createdAt: isoDaysAgo(3) },
  { id: "audit-4", action: "mute_seller", author: "Ana Ferreira", targetType: "seller", targetId: "seller-13", detail: "Vendedor mutado a pedido — reclamou de excesso de contato.", createdAt: isoDaysAgo(5) },
  { id: "audit-5", action: "reveal_contact", author: "Bruno Castro", targetType: "seller", targetId: "seller-11", detail: "Revelou telefone a partir da Fila do dia.", createdAt: isoDaysAgo(6) },
  { id: "audit-6", action: "delete_contact", author: "Camila Duarte", targetType: "seller", targetId: "seller-27", detail: "Exclusão a pedido do vendedor (LGPD); telefone mantido em hash na lista de bloqueio.", createdAt: isoDaysAgo(9) },
  { id: "audit-7", action: "discard", author: "Ana Ferreira", targetType: "vehicle", targetId: "45", detail: "Descartado: Veículo já vendido.", createdAt: isoDaysAgo(11) },
  { id: "audit-8", action: "change_weight", author: "Camila Duarte", targetType: "settings", targetId: "fipe_discount", detail: "Peso de Desconto vs FIPE alterado de 0.32 para 0.28.", createdAt: isoDaysAgo(14) },
];

import type {
  ConsorcioOfferStatus,
  ConsorcioRequiredPhotoSlot,
  TireCondition,
} from "@veiculo/types";

export const OFFER_STATUS_LABEL: Record<ConsorcioOfferStatus, string> = {
  draft: "Rascunho",
  awaiting_photos: "Aguardando fotos",
  ready: "Pronto",
  listed: "Na vitrine",
  proposed: "Com proposta",
  closed: "Encerrado",
};

export const REQUIRED_PHOTO_SLOTS: ConsorcioRequiredPhotoSlot[] = [
  "front",
  "rear",
  "side_right",
  "side_left",
  "dashboard",
  "odometer",
];

export const REQUIRED_PHOTO_LABEL: Record<ConsorcioRequiredPhotoSlot, string> = {
  front: "Frente",
  rear: "Traseira",
  side_right: "Lateral direita",
  side_left: "Lateral esquerda",
  dashboard: "Painel",
  odometer: "Velocímetro (ligado, km)",
};

export const TIRE_LABEL: Record<TireCondition, string> = {
  good: "Bom",
  fair: "Médio",
  poor: "Ruim",
  unknown: "Não informado",
};

export const MAX_DAMAGE_PHOTOS = 15;

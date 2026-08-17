/**
 * Casamento cliente × veículo (SPEC seção 10). Marca, modelo, ano, km e
 * preço são filtros duros — sugerir um Corolla pra quem quer um Onix não
 * ajuda ninguém. Câmbio e cidade são preferência: reduzem a aderência sem
 * descartar o veículo.
 */

export interface InterestCriteria {
  brand: string | null;
  model: string | null;
  yearMin: number | null;
  yearMax: number | null;
  maxKm: number | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  transmission: string | null;
  city: string | null;
}

export interface VehicleAttributes {
  brand: string | null;
  model: string | null;
  modelYear: number | null;
  km: number | null;
  priceCents: number | null;
  transmission: string | null;
  city: string | null;
}

const SOFT_PENALTY_TRANSMISSION = 20;
const SOFT_PENALTY_CITY = 10;
const MIN_QUALIFIED_SCORE = 40;

/** `null` = não casa (filtro duro reprovou). 0 nunca é devolvido pra um
 * match válido — o mínimo de um veículo qualificado é MIN_QUALIFIED_SCORE. */
export function matchInterestScore(
  interest: InterestCriteria,
  vehicle: VehicleAttributes,
): number | null {
  if (interest.brand && vehicle.brand?.toUpperCase() !== interest.brand.toUpperCase()) return null;
  if (interest.model && vehicle.model?.toUpperCase() !== interest.model.toUpperCase()) return null;

  if (interest.yearMin !== null && (vehicle.modelYear === null || vehicle.modelYear < interest.yearMin)) {
    return null;
  }
  if (interest.yearMax !== null && (vehicle.modelYear === null || vehicle.modelYear > interest.yearMax)) {
    return null;
  }
  if (interest.maxKm !== null && (vehicle.km === null || vehicle.km > interest.maxKm)) {
    return null;
  }
  if (
    interest.priceMinCents !== null &&
    (vehicle.priceCents === null || vehicle.priceCents < interest.priceMinCents)
  ) {
    return null;
  }
  if (
    interest.priceMaxCents !== null &&
    (vehicle.priceCents === null || vehicle.priceCents > interest.priceMaxCents)
  ) {
    return null;
  }

  let score = 100;
  if (interest.transmission && vehicle.transmission !== interest.transmission) {
    score -= SOFT_PENALTY_TRANSMISSION;
  }
  if (interest.city && vehicle.city?.toUpperCase() !== interest.city.toUpperCase()) {
    score -= SOFT_PENALTY_CITY;
  }

  return Math.max(MIN_QUALIFIED_SCORE, score);
}

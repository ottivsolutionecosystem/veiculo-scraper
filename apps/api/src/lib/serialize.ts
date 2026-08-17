/** Linha de `fila_do_dia` (docs/MODELO.md) -> item de lista da API (docs/API.md
 * `Pick<Vehicle, "id"|"listings"|"state"|"score"|"fipeDiscountPct"|
 * "daysListed"|"compatibleCustomersCount"|"sellerId">`, achatado). */
export function mapQueueRow(row: Record<string, unknown>) {
  return {
    id: row.veiculo_id,
    state: row.estado,
    motivoDescarte: row.motivo_descarte,
    sellerId: row.vendedor_id,
    fipeDiscountPct: row.desconto_fipe_pct === null ? null : Number(row.desconto_fipe_pct),
    fipeDiscountCents: row.desconto_fipe_reais === null ? null : Number(row.desconto_fipe_reais),
    fipeMatchConfidence: row.fipe_confianca === null ? null : Number(row.fipe_confianca),
    daysListed: Number(row.dias_no_ar),
    compatibleCustomersCount: Number(row.clientes_compativeis),
    listingsCount: Number(row.total_fontes),
    score:
      row.score_total === null
        ? null
        : {
            vehicleId: row.veiculo_id,
            total: Number(row.score_total),
            band: row.score_faixa,
            components: row.score_componentes,
            calculatedAt: row.score_calculado_em,
          },
    listing: {
      id: row.anuncio_id,
      source: row.fonte,
      normalizedTitle: row.titulo_normalizado,
      brand: row.marca,
      model: row.modelo,
      trim: row.versao,
      manufactureYear: row.ano_fabricacao,
      modelYear: row.ano_modelo,
      km: row.km,
      priceCents: row.preco === null ? null : Number(row.preco),
      transmission: row.cambio,
      fuelType: row.combustivel,
      color: row.cor,
      city: row.cidade,
      stateCode: row.uf,
      photos: row.fotos,
      active: row.ativo,
      pendingFields: row.pendencias,
    },
  };
}

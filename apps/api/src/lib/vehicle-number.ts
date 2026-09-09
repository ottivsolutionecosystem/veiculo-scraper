/**
 * Busca por número do veículo. O número que o consignador vê no card é o
 * próprio `veiculos.id`, então digitar "#42" tem que filtrar a lista pelo id
 * em vez de cair no ILIKE de texto.
 */

export interface VehicleNumberQuery {
  /** Filtra por `veiculos.id`. Null quando não veio número na busca. */
  id: number | null;
  /** O que sobra para o ILIKE. Null quando a busca foi só pelo número. */
  text: string | null;
}

function toVehicleId(value: string): number | null {
  if (!/^\d{1,15}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function parseVehicleNumberQuery(raw: string | undefined | null): VehicleNumberQuery {
  const q = raw?.trim() ?? "";
  if (!q) return { id: null, text: null };

  // Com "#" a intenção é o número e só. Sem "#", um número solto ainda pode
  // ser ano ou parte do modelo, então vale pelos dois caminhos.
  if (q.startsWith("#")) {
    const id = toVehicleId(q.slice(1).trim());
    return id === null ? { id: null, text: q } : { id, text: null };
  }
  return { id: toVehicleId(q), text: q };
}

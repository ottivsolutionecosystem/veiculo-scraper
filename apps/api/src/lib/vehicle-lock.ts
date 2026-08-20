import type { WorkLock } from "./consignacao.js";

export const VEHICLE_LOCK_SQL = `
  SELECT consignador, consignador_id, travado_ate, ultimo_contato_em, estado, vendedor_id,
         EXISTS(
           SELECT 1 FROM solicitacoes_captacao s
            WHERE s.veiculo_id = veiculos.id
              AND s.estado NOT IN ('closed', 'declined', 'no_show')
         ) AS tratativa_aberta
    FROM veiculos
   WHERE id = $1
`;

export function lockFromRow(row: {
  consignador_id: unknown;
  travado_ate: Date | string | null;
  ultimo_contato_em: Date | string | null;
  tratativa_aberta?: unknown;
}): WorkLock {
  return {
    operatorId: row.consignador_id === null || row.consignador_id === undefined ? null : Number(row.consignador_id),
    lockedUntil: row.travado_ate ? new Date(row.travado_ate) : null,
    lastContactedAt: row.ultimo_contato_em ? new Date(row.ultimo_contato_em) : null,
    openDeal: Boolean(row.tratativa_aberta),
  };
}

export const NO_OPEN_DEAL_SQL = `AND NOT EXISTS (
  SELECT 1 FROM solicitacoes_captacao s
   WHERE s.veiculo_id = f.veiculo_id
     AND s.estado NOT IN ('closed', 'declined', 'no_show')
)`;

export const NOT_STOCK_SQL = `AND f.estado NOT IN ('discarded', 'lost', 'acquired')`;

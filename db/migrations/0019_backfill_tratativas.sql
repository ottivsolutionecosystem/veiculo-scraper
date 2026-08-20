-- Carros assumidos na época do discador não tinham card no kanban.

INSERT INTO solicitacoes_captacao (veiculo_id, vendedor_id, unidade_id, responsavel, data_hora_proposta, estado)
SELECT v.id,
       v.vendedor_id,
       (SELECT u.id FROM unidades u ORDER BY u.id ASC LIMIT 1),
       COALESCE(o.login, 'sistema'),
       NULL,
       'requested'
  FROM veiculos v
  LEFT JOIN operadores o ON o.id = v.consignador_id
 WHERE v.consignador_id IS NOT NULL
   AND v.estado NOT IN ('discarded', 'lost', 'acquired')
   AND NOT EXISTS (
         SELECT 1 FROM solicitacoes_captacao s
          WHERE s.veiculo_id = v.id
            AND s.estado NOT IN ('closed', 'declined', 'no_show')
       )
   AND EXISTS (SELECT 1 FROM unidades);

UPDATE veiculos v
   SET estado = 'requested', atualizado_em = now()
 WHERE v.consignador_id IS NOT NULL
   AND v.estado IN ('contacted', 'negotiating', 'new', 'analyzing', 'interested')
   AND EXISTS (
         SELECT 1 FROM solicitacoes_captacao s
          WHERE s.veiculo_id = v.id
            AND s.estado NOT IN ('closed', 'declined', 'no_show')
       );

REFRESH MATERIALIZED VIEW fila_do_dia;

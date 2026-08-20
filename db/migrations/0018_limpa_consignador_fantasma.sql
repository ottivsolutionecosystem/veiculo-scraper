-- Nome solto no veículo sem identidade não é consignador.
-- Sobrou da época em que o nome era digitado no navegador.

UPDATE veiculos
   SET consignador = NULL
 WHERE consignador_id IS NULL
   AND consignador IS NOT NULL;

REFRESH MATERIALIZED VIEW fila_do_dia;

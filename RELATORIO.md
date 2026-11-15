# RELATORIO — total nos filtros

## Feito
- `/api/queue` e `/api/vehicles/search` devolvem `total` (COUNT com
  os mesmos filtros, sem cursor).
- Fila e Busca mostram “N carros” / “N carros com esses filtros”.

## Decidido
- COUNT separado (não window+LIMIT): total estável em qualquer página
  do cursor. Índices de `fila_do_dia` (preco, km, marca) cobrem o filtro.

## Pendente de decisão sua
- Nenhuma.

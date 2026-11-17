# RELATORIO — Telas do módulo Consórcio

## Feito
- Telas: oferecimentos (lista/novo/detalhe), vitrine lojista, cartas
  (placeholder), link público `/o/:token` pra fotos.
- Placa + cascade FIPE (marca/modelo/ano) + lance + pneus + 6 fotos + até 15
  avarias; liberar na vitrine e registrar proposta.
- Tipos em `packages/types`; regras `offer-rules` + `plate` com teste.
- Nav “Consórcio”; SPEC §11b + telas 12–14.

## Decidido
- BrasilAPI `/fipe/precos` e `/tabelas` estavam 404/500; cascade usa Parallelum
  (FIPE pública). Marcas tentam BrasilAPI e caem no Parallelum.
- Sem API de placa na BrasilAPI — FIPE é escolha manual pós-placa.
- Storage v1: data URL no `localStorage` (mock). Produção: S3/R2 depois.
- Cartas: só placeholder até API.

## Pendente de decisão sua
- Commit/deploy?
- Provedor da API de cartas.
- Se quer login do lojista separado ou a vitrine fica no mesmo painel.

# RELATORIO — limpar anúncios coletados

## Feito
- `POST /api/ops/reset-collected` (só master) + botão em Fontes.
- Script `reset-collected` passa a zerar também `ingestao_listagens`.

## Decidido por mim e por quê
- Sem DATABASE_URL daqui; o caminho é o reset já previsto no repo,
  exposto ao master para executar em produção.

## Pendente de decisão sua
- Deploy **crawler-api** + **crawler-web**, depois Fontes →
  “Limpar anúncios coletados”.

# RELATORIO — ingestão assistida no deploy

## Feito
- Commit `dc8f296` na branch `deploy` e push para
  `origin/deploy` (ottivsolutionecosystem/veiculo-scraper).
- Feature: fila `ingestao_listagens`, CLI `ingerir`, UI em Fontes,
  migration `0023` (o start da api aplica migrations no boot).

## Decidido por mim e por quê
- Push na `deploy` é o caminho de produção deste repo; não forcei nada.
- Sem acesso ao painel Dokploy daqui: o redeploy depende do auto-deploy
  ligado nos serviços api/web/work/collector.

## Pendente de decisão sua
- No Dokploy: confirmar redeploy de **api**, **web** e **work/collector**.
- Se a api ainda estiver em 500, reiniciar e olhar o log antes de testar
  a ingestão.
- Depois: Fontes → colar HTML da listagem Shopcar.

# RELATORIO — ingestão assistida de listagem Shopcar

## Feito
- Migration `0023_ingestao_listagens`: fila de HTML colado (sem GET na fonte).
- Adapter Shopcar: card da busca agora lê modelo, ano, km, cor, combustível,
  câmbio (heurística), cidade, foto, marca (URL) + `bruto_da_listagem`.
- Runner `ingerir_html` + CLI `ingerir`; loop do coletor processa a fila
  antes dos pedidos (funciona sem `BOT_CONTACT_*`).
- API: `POST/GET /api/sources/shopcar/ingest-listings` (master, até 10
  páginas/envio, body até 16 MB).
- UI em Fontes (card Shopcar): colar HTML, número da 1ª página, fila/status.
- Smoke local: fixture → 20 novos, 0 requisições. Migration aplicada no
  Postgres local.

## Decidido por mim e por quê
- Não desativar ausentes na ingestão: usuário manda páginas parciais; varredura
  completa só na coleta por rede (hoje bloqueada pela Cloudflare).
- Continua proibido bypass de Cloudflare; este fluxo usa HTML do navegador.
- `BOT_CONTACT_*` deixou de ser FATAL no loop — só os pedidos de rede precisam.

## Pendente de decisão sua
- Rodar migration `0023` e redeploy de api + collector/work no Dokploy
  (API em produção ainda estava em 500).
- Subir o coletor com `DATABASE_URL` para a fila andar a cada ~15s.

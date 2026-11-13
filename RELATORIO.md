# RELATORIO — descoberta automática do API_URL

## Feito
- Sem acesso ao Dokploy (login) nem SSH na VPS — não dá para
  mudar env/rede daqui.
- Proxy `/api` agora sonda `crawler-api`, `api` e candidatos
  via `/health` e cacheia o que responder.

## Pendente de decisão sua (1 clique)
- Deploy **crawler-web**.
- Se ainda 502: no Dokploy, mesma rede para web+api e
  `API_URL=http://<nome-do-serviço-api>:3001`.

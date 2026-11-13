# RELATORIO — HTML Shopcar ok; API prod 500

## Feito
- HTML da busca Shopcar `pagina=1` (particulares) parseia local: **20 cards**,
  0 GET na fonte (`ingerir` / `cards_de_listagem`).
- Painel em Fontes já tem o campo de colar; validação aceita esse HTML.
- Ajuste: GET `/api/sources` não quebra se `ingestao_listagens` faltar;
  mensagem de erro da web quando a API devolve 500 em texto puro;
  `start-api.sh` não morre se o seed falhar.

## Decidido por mim e por quê
- O “Payload inválido” anterior era HTML incompleto; este HTML está certo.
- O bloqueio agora é **API inacessível** em `crawler.ottiv.io` (`/api/*` →
  500 texto “Internal Server Error”, típico de rewrite Next sem upstream).
  Sem api no ar, enfileirar listagem não roda.

## Pendente de decisão sua
- No Dokploy (`dokploy.ottiv.io`): **reiniciar/redeploy do serviço api**
  (e confirmar web + collector/work). Olhar log do start (`migrations ok`).
- Depois: Fontes → colar o HTML no campo da Shopcar (não no chat) →
  Enfileirar. Página 1 = 20 anúncios; repetir com `pagina=2`… 

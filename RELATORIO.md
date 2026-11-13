# RELATORIO — captura por links (bookmarklet)

## Feito
- Painel Fontes: modo **Links** (URL base + de/até, ou cola links).
- Gera favorito “Capturar listagem Shopcar”: no Shopcar, 1 clique envia
  o HTML (Ctrl+U) e abre a próxima página da lista.
- CORS da API aceita origem shopcar para o POST do bookmarklet.

## Decidido por mim e por quê
- GET no servidor continua bloqueado pela Cloudflare — a captura tem
  que rodar no browser do usuário (mesma regra da ingestão assistida).

## Pendente de decisão sua
- Deploy **crawler-api** + **crawler-web**. Em Fontes → Links → Armar
  capturador → arrastar favorito → abrir pág.1 → clicar o favorito em
  cada página.

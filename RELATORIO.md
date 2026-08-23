# RELATORIO — progresso ao vivo na aba Fontes

## Feito
- Coletor publica `progresso` a cada página da listagem (`fase=listagem`)
  e a cada 5 fichas (`fase=fichas`).
- Fontes mostra anúncios achados, páginas, requisições, erros, novos e
  atualizados enquanto raspa — não espera o fim da enumeração.

## Decidido por mim e por quê
- Pedido explícito para mexer no coletor. Só `_enumerar` / `_detalhar`
  e o JSON `fase`; sem mudar seletor nem ritmo.
- Commit no `progresso` a cada página (~4s) é barato e é o que a UI lê.

## Pendente de decisão sua
- Redeploy do serviço **work** (imagem do coletor) para valer na VPS.
- Pedido antigo na fila: se ainda estiver rodando, só a próxima coleta
  ganha o progresso página a página.

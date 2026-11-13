# RELATORIO — selectolax 1.0 / Lexbor no coletor

## Feito
- Causa do loop falhando: `from selectolax.parser import HTMLParser`
  (Modest) quebra no selectolax ≥1.0 instalado no Nixpacks.
- Troca para `LexborHTMLParser`; requirements/Dockerfile `selectolax>=1.0.0`.
- Smoke: fixture busca → 20 cards.

## Decidido por mim e por quê
- Migrar para Lexbor (recomendação oficial) em vez de pinar 0.3.x.

## Pendente de decisão sua
- Redeploy **crawler-collector** (e work se roda o coletor) após o push.
  Log ok: `ciclo ingestao` sem ImportError; #1 processa.

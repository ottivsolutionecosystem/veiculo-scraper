# RELATORIO — 404 do userscript

## Feito
- 404 em `/capturar-shopcar.user.js`: no standalone o `public/`
  às vezes não sobe; agora a rota App Router `/capturar-shopcar`
  serve o JS e o rewrite mapeia `.user.js` → essa rota.
- Fonte única em `capturar-shopcar-userscript.ts` (+ cópia em `public/`).

## Decidido
- Servir via route handler (mesmo pipeline do painel), não só arquivo estático.

## Pendente de decisão sua
- Deploy **crawler-web** no Dokploy.
- Abrir de novo `https://crawler.ottiv.io/capturar-shopcar.user.js`
  (deve baixar/instalar no Tampermonkey, não 404).

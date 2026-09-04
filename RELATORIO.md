# RELATORIO — app responsivo e PWA

## Feito
- Casco mobile: barra inferior (Fila / Kanban / Estoque) + menu hamburger
  para administração. Desktop segue com sidebar.
- Área segura, botões e inputs em 44px no toque.
- Filtros da fila em folha no telefone. Tabelas viram cards.
- PWA: manifest, ícones, service worker, banner de instalar.

## Decidido por mim e por quê
- SW nativo (sem next-pwa). Network-first nas páginas, cache-first em
  `/_next/static`. Não cacheia `/api`.

## Pendente de decisão sua
- Redeploy do **web**. Instalar no celular via HTTPS.

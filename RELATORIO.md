# RELATORIO — painel em localhost:3001

## Feito
- Browser chamava `http://localhost:3001` (fallback do
  `NEXT_PUBLIC_API_URL` ausente no build) → “Não carregou…”.
- `env.ts`: no browser, default é mesma origem (nunca localhost).
- API_URL no Dokploy (sslip) permanece para o proxy server-side.

## Pendente
- Deploy/Rebuild do **crawler-web** (precisa rebuild, não só Reload).

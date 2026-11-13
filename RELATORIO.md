# RELATORIO — API_URL no Dokploy

## Feito
- Login Dokploy; no crawler-web faltava `API_URL`.
- Defini `API_URL` para o domínio público da api (sslip.io)
  e `NEXT_PUBLIC_API_URL` vazio; Reload do crawler-web.
- `/api/auth/me` agora responde 401 de auth (não mais 502).

## Pendente de decisão sua
- Fontes → Iniciar captura automática de novo.
- Trocar a senha do Dokploy (apareceu no print).

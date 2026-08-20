# Deploy na VPS

O programador preenche domínio e segredos. OLX e Webmotors ficam desligadas.

1. DNS do `DOMAIN` neste IP. Firewall: 22, 80, 443.
2. Clone o repo. `cp deploy/env.example .env.prod` e edite senha, `SESSION_SECRET` (≥ 32) e `BOT_CONTACT_*`.
3. `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
4. Abra `https://DOMAIN` e crie o master. Em Fontes, “Rodar coleta agora”.

Atualizar: `git pull` e o mesmo `compose up`. Logs: `docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f`

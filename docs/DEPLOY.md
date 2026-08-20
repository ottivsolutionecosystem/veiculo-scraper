# Deploy na VPS

O programador preenche domínio e segredos. OLX e Webmotors ficam desligadas.

1. DNS do `DOMAIN` neste IP. Firewall: 22, 80, 443.
2. Clone o repo. `cp deploy/env.example .env.prod` e edite senha, `SESSION_SECRET` (≥ 32) e `BOT_CONTACT_*`.
3. `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
4. Abra `https://DOMAIN` e crie o master. Em Fontes, “Rodar coleta agora”.

Atualizar: `git pull` e o mesmo `compose up`. Logs: `docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f`

## Dokploy com Nixpacks

Crie um projeto no Dokploy e conecte os três serviços ao mesmo repositório. Em
cada aplicação, use a raiz do repositório como **Build Path** e configure
`NIXPACKS_CONFIG_FILE` com o arquivo correspondente:

| Serviço | Configuração | Start | Porta |
|---|---|---|---|
| api | `deploy/nixpacks/api.toml` | `sh deploy/start-api.sh` | `3001` |
| work | `deploy/nixpacks/work.toml` | `bash deploy/start-work.sh` | nenhuma |
| web | `deploy/nixpacks/web.toml` | `node apps/web/server.js` | `3000` |

O serviço `work` contém o worker BullMQ e o coletor Python. O Nixpacks
instala o Python pelo apt (não pelo Nix) e as deps do coletor em
`/app/.venv`. Ele precisa de `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`,
`BOT_CONTACT_URL` e `BOT_CONTACT_EMAIL`. O `api` precisa de `DATABASE_URL`,
`REDIS_URL`, `SESSION_SECRET` e `WEB_ORIGIN`. O `web` precisa de
`API_URL=http://api:3001`.

Crie também Postgres e Redis no mesmo projeto/rede compartilhada, ou aponte
essas variáveis para serviços já existentes. Os hostnames `api`, `postgres` e
`redis` são exemplos: no Dokploy use exatamente os nomes DNS dos serviços que
aparecerem na rede compartilhada.

No `web`, deixe `NEXT_PUBLIC_API_URL` vazio. O Next encaminha `/api/*` para
`API_URL` pela rede interna; portanto, publique apenas o `web` e configure o
domínio/HTTPS nele. Publique a porta `3001` do `api` somente se houver uma
integração externa que precise acessar a API diretamente.

Variáveis comuns:

```env
NODE_ENV=production
SESSION_SECRET=gere-um-segredo-aleatorio-com-32-ou-mais-caracteres
DATABASE_URL=postgresql://veiculo:SENHA@postgres:5432/veiculo_scraper
REDIS_URL=redis://redis:6379
WEB_ORIGIN=https://app.exemplo.com.br
BOT_CONTACT_URL=https://app.exemplo.com.br/bot
BOT_CONTACT_EMAIL=contato@exemplo.com.br
API_URL=http://api:3001
NEXT_PUBLIC_API_URL=
```

O primeiro start da `api` aplica o schema, migrations e seed de configuração.
Como são operações idempotentes, reiniciar o serviço é seguro. Faça o deploy
do banco/Redis antes dos três serviços e confirme que todos estão na mesma
rede externa do Dokploy.

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

| Serviço | Configuração | Variáveis (exemplo) | Start | Porta |
|---|---|---|---|---|
| api | `deploy/nixpacks/api.toml` | `deploy/nixpacks/api.env.example` | `sh deploy/start-api.sh` | `3001` |
| work | `deploy/nixpacks/work.toml` | `deploy/nixpacks/work.env.example` | `bash deploy/start-work.sh` | nenhuma |
| collector | `deploy/nixpacks/collector.toml` | `deploy/nixpacks/collector.env.example` | `bash deploy/start-collector.sh` | nenhuma |
| web | `deploy/nixpacks/web.toml` | `deploy/nixpacks/web.env.example` | `sh deploy/start-web.sh` | `3000` |

Para a raspagem, use **ou** o serviço `work` (worker BullMQ + coletor no mesmo
processo) **ou** o `work` só com worker e o `collector` separado. No `work` com
collector separado, defina `COLLECTOR_ENABLED=false` — sem isso o script ainda
tenta subir o coletor e repete FATAL no log. Sem coletor rodando em algum
serviço, o painel sobe, o botão grava o pedido, e a tela fica em “Coletor
parado”. O Nixpacks instala o Python pelo apt (não pelo Nix) e as deps do
coletor em `/app/.venv`. O `collector` precisa de `DATABASE_URL`,
`BOT_CONTACT_URL` e `BOT_CONTACT_EMAIL`. O `work` precisa de `DATABASE_URL`,
`REDIS_URL`, `SESSION_SECRET` e `WEB_ORIGIN`; para coletor junto, `BOT_CONTACT_*`
(ou `COLLECTOR_ENABLED=false` se o collector é outro serviço). O `api` precisa
de `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` e `WEB_ORIGIN`. O `web` precisa
de `API_URL=http://api:3001`.

Se o coletor cair, o worker BullMQ **continua**. No log do `work` procure:

- `work: coletor iniciando` e `coletor: ciclo pedidos shopcar` — saudável
- `FATAL: defina BOT_CONTACT_URL` — variáveis no serviço errado
- `coletor saiu rc=` — o loop tenta de novo em 15s; o worker não cai junto
- `pedido #… [shopcar]` — pegou a fila

Pedido já gravado não precisa de outro clique (409 se empilhar).

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

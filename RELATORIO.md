# RELATORIO — pacote de VPS

## Feito
- Compose de produção: web, api, worker, collector, Postgres, Redis, Caddy.
- Dockerfiles dos quatro processos. Worker = `node dist/src/worker.js`.
- HTTPS no Caddy (`/api` e `/health` na mesma origem). Cookie `Secure` em HTTPS.
- `SESSION_SECRET` obrigatório e ≥ 32 chars em `NODE_ENV=production`.
- Migrate encontra `db/` no JS compilado. Seed idempotente no boot.
- `docs/DEPLOY.md` + `deploy/env.example`. OLX/Webmotors desligadas.

## Decidido por mim e por quê
- Caddy em vez de Nginx: HTTPS automático com Let's Encrypt, arquivo único.
- Browser chama `/api` na mesma origem — não precisa rebuild por domínio.
- Compose local (`docker-compose.yml`) continua só Postgres/Redis de dev.
- Thumbs/MinIO e OLX/Webmotors fora deste pacote.

## Pendente de decisão sua
- Nenhuma para o programador subir. DNS, senhas e `BOT_CONTACT_*` são dele.

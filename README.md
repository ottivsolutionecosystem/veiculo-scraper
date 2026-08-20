# veiculo-scraper

Plataforma de captação de veículos para repasse/consignação: coleta anúncios de
classificados, normaliza, deduplica, compara com a FIPE, ranqueia por
oportunidade e organiza o contato com o vendedor até o veículo chegar na loja.

## Estrutura

| Caminho | O que é |
|---|---|
| `SPEC.md` | Especificação do produto. |
| `CLAUDE.md` | Regras de trabalho no repositório. |
| `apps/web` | Painel Next.js (`:3000`). |
| `apps/api` | API Fastify (`:3001`) + worker BullMQ. |
| `packages/types` | Tipos de domínio. |
| `db/` | Schema da coleta e migrations. |
| `services/collector/` | Coletor Python. |
| `docker-compose.yml` | Postgres 16 + Redis (se tiver Docker). |
| `scripts/dev-infra.ps1` | Postgres + Redis portáteis no Windows, sem Docker. |

## Subir o ambiente (Windows)

Na primeira vez:

```powershell
copy apps\api\.env.example apps\api\.env
npm install
npm run infra:up
npm run db:migrate
npm run db:seed
```

`infra:up` usa Docker se existir `docker` no PATH; nesta máquina sobe
binários em `.local/` (Postgres 16 + Redis, gitignorados).

Ou um comando só (sobe o que ainda não estiver no ar):

```powershell
npm run dev:all
```

Equivalente em três terminais: `npm run dev`, `npm run dev:api`, `npm run dev:worker`.

Abra `http://localhost:3000`. A Fila do dia só mostra veículos da coleta real.
Em Fontes, “Só particular” usa `busca.php?tipo=1&tipoanuncio=2` (~1546 anúncios,
~2h no ritmo educado). `db:seed` preenche FIPE/config; não inventa anúncio.

## Coletor

O botão **Rodar coleta agora** (tela Fontes) só grava um pedido no Postgres.
Nada raspa até o loop Python estar no ar neste PC:

```powershell
npm run collector:setup   # uma vez: venv + testes offline
$env:BOT_CONTACT_URL = "https://seudominio.com.br/bot"
$env:BOT_CONTACT_EMAIL = "contato@seudominio.com.br"
npm run dev:collector     # lê a fila a cada 15s
```

Sem `BOT_CONTACT_URL` e `BOT_CONTACT_EMAIL` o loop recusa subir — o User-Agent
do bot precisa de um contato real, não de placeholder.

Coleta direta (sem o botão):

```powershell
cd services/collector
$env:DATABASE_URL = "postgresql://root:devpassword@127.0.0.1:5432/veiculo_scraper_dev"
$env:BOT_CONTACT_URL = "https://seudominio.com.br/bot"
$env:BOT_CONTACT_EMAIL = "contato@seudominio.com.br"
.\.venv\Scripts\python.exe -m captacao_bot.cli coletar --fonte shopcar --limite 20 --postgres
```

## Estado atual

- Painel, API, worker, migrations e seed prontos (fases 1–4).
- Fonte `shopcar`: ativa (seletores ainda hipótese contra HTML real).
- Fontes `webmotors` e `olx`: desligadas — ver seção 4 do SPEC.

## Produção (VPS)

Pacote pronto em `docker-compose.prod.yml`. O programador só preenche
`.env.prod` (domínio, senhas, contato do bot) e sobe. Passo a passo:
`docs/DEPLOY.md`.

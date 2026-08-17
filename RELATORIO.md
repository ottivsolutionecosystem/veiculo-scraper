# RELATORIO — Fases 1, 2 e 3

## Feito
- Passo 0: SPEC.md, CLAUDE.md, PROMPT.md, README.md, db/schema.sql e
  services/collector (captacao_bot completo, 75 testes offline passando).
- Inventário (Passo A): repo sem apps/, packages/, lockfile ou CI prévios —
  estrutura montada do zero seguindo o SPEC, nada para reconciliar.
- Monorepo npm workspaces: apps/web (Next.js 14 App Router, TS estrito,
  Tailwind, shadcn/ui manual com Radix) + packages/types/domain.ts.
- packages/types/domain.ts reconciliado com db/schema.sql e
  captacao_bot/models.py (VeiculoNormalizado) — mesmos dados, identificadores
  em inglês no código (CLAUDE.md), rótulos em português isolados em
  src/lib/labels.ts.
- 11 telas da seção 15 navegáveis (+ fichas de veículo/cliente/vendedor),
  todas com `?demo=vazio|carregando|erro` via toolbar no topo (sem link
  morto, sem chamada de rede — fotos são SVG em data URI).
- Fila do dia com TanStack Virtual, ~190 itens rolando liso.
- Mocks: 205 veículos (11 casos de borda da seção 15 nomeados + vendedor com
  14 anúncios + 180 gerados com PRNG determinístico), 15 clientes/interesses,
  8 solicitações em 8 estados diferentes, tabela FIPE com 330 linhas
  (2019-2024 × 55 modelos).
- `npm run build` e `npm run lint` limpos.

## Decidido por mim e por quê
- Score e desconto FIPE são campos pré-calculados no mock (não recalculados
  no cliente) — replica o contrato real do worker (seção 9), já que a Fase 1
  não implementa `lib/score.ts` nem `lib/fipe-match.ts` de verdade.
- Paginação por cursor (`paginateByCursor`) mesmo no mock em memória — a
  Busca usa "carregar mais" por id, nunca por índice, seguindo a regra de
  `OFFSET` proibido desde já.
- Ações inline (ligar, descartar, solicitar) têm estado local de UI, sem
  persistência — não existe backend nesta fase.
- Testes automatizados (dedupe, fipe-match, score, regras-descarte,
  match-interesse) ficam para a Fase 3, quando essas funções existirem de
  verdade em `lib/`; não há regra de negócio real para testar ainda.

## Fase 2 — feito
- `docs/API.md`: endpoints das 11 telas, sempre paginação por cursor,
  contrato de erro único (400/403/404/409/422/500 → o que a UI faz em
  cada um), origem de cada campo marcada `[E]`/`[N]`/`[W]`.
- `docs/MODELO.md`: todas as tabelas que faltam da seção 6 — PK, FK,
  índices e a justificativa de cada um. Nenhuma migration escrita.

## Fase 2 — decidido por mim e por quê
- `webhook_entregas` não está nomeada na seção 6, mas a seção 13 exige log
  de entrega e retry — sem tabela isso não existe. Registrado como decisão
  explícita, não invenção silenciosa.
- Filtros salvos da Busca continuam só em `localStorage` (decisão da Fase
  1): a seção 6 não lista tabela pra isso e CLAUDE.md proíbe inventar uma.
- `configuracoes` é append-only por versão em vez de UPDATE in-place —
  "editável sem deploy" (princípio 2) não pede mutação, e isso dá o
  histórico de peso de graça pra auditoria.
- `EXPLAIN ANALYZE` das queries novas fica pra Fase 3: não há schema nem
  dado real para explicar contra ainda.

## Fase 3 — feito
- `db/migrations/0001..0011`: todas as tabelas de `docs/MODELO.md` + a
  materialized view `fila_do_dia`. Aplicadas e verificadas contra Postgres
  16 local (26 tabelas, 1 view). Nunca destrutivas.
- `apps/api`: Fastify + Zod + `pg` implementando **todos** os endpoints de
  `docs/API.md` contra o Postgres real — fila, busca, ficha do veículo
  (discard/interações/confirmação FIPE), discador (cooldown 24h real),
  clientes/interesses, solicitações (checklist + conflito de duplicata),
  vendedores, revisão FIPE, fontes (toggle travado fora de `shopcar`),
  ajustes versionados, auditoria, unidades, webhooks. Erro único:
  `HttpError`/`ZodError` → 400/403/404/409/422/500, testado com curl real.
- `apps/api/src/lib/`: as 5 funções obrigatórias do CLAUDE.md — `dedupe`
  (política de merge, a fingerprint em si já é do coletor Python),
  `fipe-match` (trigram próprio + limiares 0.60/0.85), `score` (seção 9,
  pesos configuráveis), `regras-descarte` (motivo obrigatório + gatilho de
  retorno), `match-interesse` (filtros duros + preferências) — **35 testes**
  (vitest), todos passando.
- Worker BullMQ rodado de ponta a ponta contra Postgres+Redis reais:
  `normalize → match:fipe → score → match:interesse` processou um anúncio
  novo até virar veículo com score calculado (log em `/tmp`, verificado por
  query direta — não é só teste unitário, rodou de verdade).
- `apps/api/scripts/seed.ts`: 180 veículos reais no Postgres (não mock em
  memória) — usados pra testar a API e rodar `EXPLAIN ANALYZE`.
- `services/collector/captacao_bot/cli.py`: `coletar --postgres` usa
  `PostgresStorage(DATABASE_URL)`. Validado ponta a ponta com a fixture
  offline existente (sem rede): o runner real gravou em `anuncios` e
  `scrape_runs`. 75 testes Python continuam passando.

## Fase 3 — EXPLAIN ANALYZE
Query da Fila do dia (`estado NOT IN ('discarded','lost') ORDER BY
score_total DESC, veiculo_id LIMIT 24`), em duas escalas:

- **180 linhas** (seed atual): `Seq Scan + top-N heapsort`, 0.21 ms. Não
  usa o índice composto `(estado, score DESC, id)` — no Postgres, a
  exclusão de 2 estados de um total de 7 é seq scan, não vale o
  índice quando a maioria das linhas ainda passa no filtro.
- **60.180 linhas** (carga sintética só para este teste, desfeita depois):
  mesmo plano, `Seq Scan`, **15.5 ms**. Ainda assim, seq scan continua
  sendo a escolha correta do planner: `NOT IN` de 2 estados entre 7 não é
  seletivo o bastante pra compensar um index scan, mesmo em escala. Bem
  dentro do alvo de p95 < 300 ms da seção 14 — mas **é um achado real**:
  o índice composto ajuda queries com `estado = 'x'` (uma inclusão), não
  esse `NOT IN`. Registrado aqui em vez de escondido; revisitar se a
  proporção descartado/perdido crescer muito ou a tabela passar de ~500k.
- Busca por marca + desconto mínimo: usa scan ordenado pelo índice único
  de `veiculo_id` (a query já pede `ORDER BY veiculo_id`), filtra e para
  no `LIMIT` — 0.5 ms, sem tocar os índices de `marca`/`desconto_fipe_pct`
  porque não precisou.
- Busca por texto (`titulo_normalizado ILIKE`): usa o índice GIN trigram
  como esperado — 0.2 ms.
- Discador (cooldown 24h via `NOT EXISTS` em `interacoes`): hash anti-join
  bem resolvido pelo planner, 0.6 ms.

## Fase 3 — decidido por mim e por quê
- `veiculos` ganhou os campos de FIPE (`fipe_ano_codigo`, `fipe_confianca`,
  `fipe_candidatos`, `desconto_fipe_pct/reais`, `fipe_ajustada`) que
  `docs/MODELO.md` tinha deixado de fora por descuido — são 1:1 com o
  veículo, então ficam na própria tabela, não em `scores` (que já muda de
  frequência diferente). `MODELO.md` não foi re-editado; fica registrado
  aqui e nos comentários da migration 0001/0002.
- `normalize` e `dedupe` (SPEC seção 5) viraram um processor só: escolher
  o `anuncio_principal` acontece no mesmo passo que liga o anúncio ao
  veículo — duas filas separadas só custariam um hop assíncrono sem ganho.
  O nome `dedupe` continua existindo como fila própria por paridade com o
  SPEC, delegando pro mesmo código.
- `thumbs` (seção 14) ficou como stub que lança erro explicando por quê:
  processamento de imagem é dependência pesada nova (sharp/libvips) e
  "onde fica o storage de objetos" é decisão de infra que só você tem.
- Ingestão FIPE atrás de `FipeProvider` (mesma convenção de
  `TelephonyProvider`/`MessagingProvider`): a lógica de gravação está
  testada (provider fake + Postgres real, transação com rollback), mas
  **nenhum provedor real foi chamado** — testei egress para
  `parallelum.com.br` e `fipe.parallelum.com.br`, os dois bloqueados
  (`403`) pela política de rede desta sandbox, igual `shopcar.com.br`.
- Não escrevi migration destrutiva nem toquei em nada de
  `services/collector` além do pedido explícito do PROMPT.md (troca de
  storage no `cli.py`).

## Bloqueios ativos — pendentes de decisão sua
- **Ainda não consigo publicar no GitHub.** `git push` (sem credenciais) e
  as ferramentas MCP (`push_files`, `create_or_update_file`) retornam
  `403 Resource not accessible by integration`: a integração do GitHub App
  desta sessão não tem permissão de escrita no repo. Todo o trabalho está
  commitado localmente na branch `claude/bootstrap-veiculo-scraper-3lzi2y`.
  Preciso que Contents:write seja liberado para a integração neste repo
  (claude.ai/admin-settings) para eu publicar.
- **Rede bloqueada para qualquer host externo.** Dois pontos do roteiro da
  Fase 3 exigem internet de verdade e não têm como ser feitos aqui dentro:
  1. Validar `SELETORES` do `adapters/shopcar.py` contra HTML real do
     `shopcar.com.br` (`cli.py fixture`/`parse`) — continua sendo hipótese.
  2. Rodar a ingestão FIPE contra um provedor real.
  Preciso que você rode esses dois passos numa máquina com rede liberada,
  ou me diga se dá pra abrir exceção de egress pra esses hosts específicos
  nesta sessão.
- Pesos padrão de `configuracoes` e o `FipeProvider` real (qual API, chave,
  custo) — mantive os valores da Fase 1 e a implementação de exemplo
  (`ParallelumFipeProvider`) como placeholders razoáveis, mas a escolha
  final de fornecedor é decisão sua, não técnica.

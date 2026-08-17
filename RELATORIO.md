# RELATORIO — Fases 1 e 2

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

## Bloqueio ativo — pendente de decisão sua
- **Ainda não consigo publicar no GitHub.** `git push` (sem credenciais) e
  as ferramentas MCP (`push_files`, `create_or_update_file`) retornam
  `403 Resource not accessible by integration`: a integração do GitHub App
  desta sessão não tem permissão de escrita no repo. Todo o trabalho está
  commitado localmente na branch `claude/bootstrap-veiculo-scraper-3lzi2y`.
  Preciso que Contents:write seja liberado para a integração neste repo
  (claude.ai/admin-settings) para eu publicar.
- Aguardando sua aprovação da Fase 2 antes de escrever migration
  (PROMPT.md: Fase 3 só começa depois de aprovada).

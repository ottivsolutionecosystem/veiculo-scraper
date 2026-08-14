# Prompts para o Claude Code

Cole um bloco por vez, na ordem. Não pule fase.

---

## Antes de abrir o Claude Code

```bash
cd veiculo-scraper
git checkout -b estrutura-inicial

cd services/collector
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest -q            # 75 passando — se falhar, resolva antes de continuar
cd ../..

git add -A && git commit -m "adiciona spec, regras de trabalho e coletor python"
```

---

## Fase 1 — Frontend completo com mock

```
Leia SPEC.md e CLAUDE.md por completo antes de escrever qualquer linha de código.

Este repositório já existe e pode ter conteúdo anterior.

PASSO A — inventário, antes de tudo:
Liste o que já existe no repo (config, README, CI, código, dependências,
convenções de lint/format) e me diga em no máximo 10 linhas:
- o que existe
- o que conflita com a estrutura descrita no SPEC
- o que você vai reaproveitar em vez de recriar

Regra: adapte a estrutura do SPEC ao que já está no repo, não o contrário. Se o
repo já tem convenção de lint, formatação, gerenciador de pacote ou layout de
pastas, siga a que existe. Não sobrescreva README, .gitignore, CI ou config
existente — proponha o merge no RELATORIO.md.

O QUE JÁ ESTÁ NO REPO E É FECHADO
- services/collector/: coletor Python, 75 testes offline passando.
  NÃO reescreva, NÃO migre para TypeScript, NÃO altere.
  Leia services/collector/README.md para entender o contrato de dados.
- db/schema.sql: tabelas da coleta (fontes, anuncios, preco_historico,
  scrape_runs). O resto do modelo da seção 6 do SPEC ainda não existe.

Projeto autônomo: não existe sistema externo, CRM de terceiro ou plataforma
legada. Se um requisito parecer pedir integração externa, pergunte.

PASSO B — FASE 1, e só ela: frontend completo, navegável, com dados mockados
realistas. Nenhum backend, nenhuma chamada de rede, nenhum scraper.

Entregue nesta ordem, sem pedir confirmação entre os passos:

1. Plano curto (máx. 25 linhas): telas, componentes compartilhados, shape do mock.

2. apps/web em Next.js (App Router) + TypeScript + Tailwind + shadcn/ui,
   rodando com `npm run dev`, com as 11 telas da seção 15 do SPEC navegáveis,
   todas com estado vazio, loading (skeleton, não spinner) e erro.

3. packages/types/domain.ts como fonte da verdade dos tipos. Alinhe com
   db/schema.sql e com VeiculoNormalizado
   (services/collector/captacao_bot/models.py) — abra os dois arquivos e
   concilie os nomes de campo. O mock é tipado por esse arquivo.

4. apps/web/src/mocks/ com no mínimo 200 anúncios cobrindo TODOS os casos de
   borda da seção 15, 15 clientes com interesses, 8 solicitações em estados
   diferentes, e uma tabela FIPE reduzida (~300 linhas) para os cálculos de
   desconto baterem.

5. Fila do dia com lista virtualizada (TanStack Virtual) já nesta fase, rolando
   liso com os 200+ itens.

6. RELATORIO.md: feito / decidido por você e por quê / pendente de decisão minha,
   incluindo o resultado do inventário do Passo A. Máximo 40 linhas.

Commits pequenos, um por unidade lógica, na branch atual. Não faça merge.

Decisão reversível: decida, registre no RELATORIO.md e siga. Só pare se estiver
bloqueado por informação que só eu tenho.
```

---

## Fase 2 — Plano de integração (só documento)

```
Fase 1 aprovada. FASE 2: só documento, nenhum código.

docs/API.md — para cada tela: endpoints (método, rota, params, body), shape de
request e response reusando packages/types, paginação por cursor em toda lista,
erros possíveis e o que a UI faz em cada um, e a origem de cada campo (tabela
existente, cálculo do worker, ou tabela que ainda não existe — marque essas).

docs/MODELO.md — as tabelas que faltam para cobrir a seção 6 do SPEC, com PK,
FK, índices e a justificativa de cada índice.

Não escreva migration. Aguarde aprovação.
```

---

## Fase 3 — Backend real

```
Fase 2 aprovada. FASE 3, nesta ordem:

1. Migrations do docs/MODELO.md. Nunca destrutivas.
2. Ingestão da FIPE completa por mês de referência (job mensal). Nenhuma
   consulta a API externa por anúncio.
3. lib/fipe-match.ts conforme a seção 8 do SPEC, com testes e fila de revisão.
4. lib/score.ts conforme a seção 9, calculado no worker, com testes.
5. apps/api implementando docs/API.md contra dados reais.
6. Trocar MemoryStorage por PostgresStorage no CLI do coletor
   (services/collector/captacao_bot/cli.py) e rodar a fonte shopcar ponta a
   ponta.

Antes do passo 6, valide os seletores do adapter contra HTML real:
   python -m captacao_bot.cli fixture --fonte shopcar --url <URL de anúncio>
   python -m captacao_bot.cli parse --fonte shopcar --arquivo <fixture salva>
Ajuste SELETORES até o parse sair completo. Nunca ajuste seletor tentando
contra o site.

EXPLAIN ANALYZE de toda query nova de fila ou busca, no RELATORIO.md.
```

---

## Fase 4 — Clientes, casamento, solicitações, discador

```
Fase 3 aprovada. FASE 4:

1. Clientes e interesses (seção 10 do SPEC), com CRUD completo.
2. Job match:interesse, gerando matches_interesse com score de aderência,
   com testes. Alimenta o componente "Demanda interna" do score.
3. Solicitações de captação (seção 11): estados, agenda por unidade com limite
   por período, checklist de recepção, lembretes.
4. Discador (seção 12): tel: e wa.me atrás de TelephonyProvider e
   MessagingProvider. Modal de resultado obrigatório após cada ligação.
5. Webhooks de saída (seção 13): HMAC-SHA256, retry com backoff, log de entrega
   na UI.

Nenhum fornecedor de telefonia ou mensageria é escolhido nesta fase. Só as
interfaces e as implementações tel:/wa.me.
```

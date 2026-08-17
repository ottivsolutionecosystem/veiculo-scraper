# API.md — Contrato da API real (Fase 2)

Só documento — nenhum endpoint implementado aqui. `apps/api` continua sem
código até a Fase 3. Convenções gerais primeiro, depois um bloco por tela
da seção 15 do SPEC.

Rotas em inglês (código — CLAUDE.md); mensagens de erro devolvidas ao
cliente em português (texto de interface).

## Convenções

**Paginação.** Toda lista usa cursor, nunca `OFFSET` (CLAUDE.md). Query
params `?cursor=<opaco>&limit=<n, default 24, max 100>`. Resposta sempre:

```
{ items: T[], nextCursor: string | null }
```

O cursor é opaco ao cliente — internamente é o `id` (ou `(score,id)` na
fila) do último item da página anterior, mesma técnica keyset usada em
`apps/web/src/mocks/index.ts::paginateByCursor` na Fase 1.

**Shapes.** Tipos referenciados como `Vehicle`, `Listing`, `Customer` etc.
são os de `packages/types/domain.ts` — fonte da verdade. Onde o endpoint
devolve só um subconjunto (para não estourar payload em listas grandes),
uso notação `Pick<Tipo, "campo1" | "campo2">`; nenhum tipo novo é criado
nesta fase (é código, Fase 2 é só documento).

**Origem de cada campo.** `[E]` tabela existente (`db/schema.sql`), `[N]`
tabela nova (`docs/MODELO.md`), `[W]` calculado pelo worker e persistido
(nunca em tempo de request — CLAUDE.md proíbe).

**Erros — contrato comum a todo endpoint:**

| Status | Quando | O que a UI faz |
|---|---|---|
| 400 | payload não passa no `zod` | erro inline no campo, formulário não envia |
| 403 | ação bloqueada por regra de produto (ex: ligar `webmotors`/`olx`) | mensagem fixa explicando a regra, sem retry |
| 404 | recurso não existe | tela de "não encontrado" (`not-found.tsx`, já existe na Fase 1) |
| 409 | conflito de estado (ex: solicitação duplicada em aberto) | toast explicando o conflito, não abre formulário vazio |
| 422 | violação de regra de negócio (motivo obrigatório, checklist incompleto) | mesma tela/dialog, mensagem de validação, não fecha |
| 500 | erro interno | boundary de erro (`error.tsx`, já existe na Fase 1) com botão "tentar novamente" |

## 1. Fila do dia (`/`)

| Método | Rota | Params | Body |
|---|---|---|---|
| GET | `/api/queue` | `cursor?`, `limit?`, `estado?[]`, `sellerType?` | — |
| POST | `/api/vehicles/:id/interactions` | — | `{ channel, outcome?, durationSeconds? }` |
| POST | `/api/vehicles/:id/discard` | — | `{ reason: string, notes?: string }` |
| POST | `/api/sellers/:id/reveal-contact` | — | — |

`GET /api/queue` devolve `Pick<Vehicle, "id"|"listings"|"state"|"score"|
"fipeDiscountPct"|"daysListed"|"compatibleCustomersCount"|"sellerId">`
(sem `priceHistory` completo — só o necessário pro card). Fonte: view
materializada `fila_do_dia` [N] (junta `veiculos` [N], `anuncios` [E],
`scores` [N]); `score` é `[W]`, calculado no worker e lido pronto.

`estado` default exclui `discarded`/`lost` (mesma regra de
`queueVehicles()` da Fase 1).

`sellerType` (Fase 4, pedido do usuário): `"individual"` (particular) ou
`"dealer"` (loja); omitido = ambos. Mapeia `anuncios.tipo_anunciante` —
`null` (não detectado pelo coletor) nunca casa com nenhum dos dois valores,
só aparece quando o filtro está ausente.

`POST .../discard`: 422 se `reason` vazio (seção 7.2: "todo descarte exige
motivo"). Grava em `estados_veiculo` [N] + atualiza `veiculos.estado` [N].

`POST .../reveal-contact`: lê `contatos_vendedor` [N], grava linha em
`auditoria` [N] (`action: "reveal_contact"`). 403 se o vendedor está em
`nao_perturbe` — a revelação em si não fere "não perturbe" (é a equipe
vendo o número, não contato ativo), então na prática isso não bloqueia;
mantenho o campo aqui só pra deixar a regra explícita e não reintroduzi-la
por engano em Fase 4.

## 2. Busca (`/busca`)

| Método | Rota | Params |
|---|---|---|
| GET | `/api/vehicles/search` | `cursor?`, `limit?`, `brand?`, `model?`, `city?`, `yearMin?`, `yearMax?`, `priceMaxCents?`, `minFipeDiscountPct?`, `transmission?`, `onlyActive?`, `sellerType?` |

Mesmo shape de item do `/api/queue`, mesma origem (`fila_do_dia` [N]) —
mas **sem** o filtro implícito de estado da fila: Busca mostra qualquer
estado, inclusive descartado/perdido, se o filtro pedir.

**Filtros salvos nomeados** (seção 15.2) continuam client-side
(`localStorage`, decisão da Fase 1 em `saved-filters.tsx`) — a seção 6 do
SPEC não lista uma tabela `filtros_salvos`, e CLAUDE.md proíbe inventar
tabela fora do SPEC. Fica marcado aqui como pendência: se precisar
sincronizar entre dispositivos, é decisão sua adicionar a tabela numa
fase futura.

## 3. Ficha do veículo (`/veiculos/:id`)

| Método | Rota | Body |
|---|---|---|
| GET | `/api/vehicles/:id` | — |
| POST | `/api/vehicles/:id/fipe-match/confirm` | `{ fipeCode: string }` |
| POST | `/api/requests` | `{ vehicleId, branchId, customerId?, proposedAt }` |

`GET` devolve `Vehicle` completo: `listings` [E] (via `anuncio_veiculo`
[N]), `score` com `componentes` [W], `priceHistory` [E]
(`preco_historico`), vendedor com "outros carros dele" (`veiculos` [N]
por `vendedor_id`), `matches_interesse` [N] → clientes compatíveis, e
`fipeMatchCandidates` [W] só quando `fipeMatchConfidence` está entre 0.60
e 0.85 (seção 8) — calculado por `lib/fipe-match.ts` contra `fipe_anos`/
`fipe_aliases` [N] no momento da normalização, não no request.

`POST .../fipe-match/confirm`: grava `fipe_aliases` [N] (padrão de texto
→ código FIPE, vale para os próximos anúncios com o mesmo título
normalizado), recalcula `desconto_fipe_pct`/`_reais` em `veiculos` [N] e
enfileira recálculo de score. 404 se `fipeCode` não existe em
`fipe_precos` [N].

`POST /api/requests`: cria `solicitacoes_captacao` [N]. 409 se já existe
solicitação em aberto pro mesmo `vehicleId` (índice parcial em
`MODELO.md`). Não dispara webhook: a seção 13 só nomeia
`solicitacao.mudou_estado` para *transições* de estado — a criação
inicial não é uma transição, então fica sem evento nesta fase (decisão
registrada, não lacuna esquecida).

## 4. Discador (`/discador`)

| Método | Rota | Params/Body |
|---|---|---|
| GET | `/api/dialer/queue` | `cursor?`, `limit?` |
| POST | `/api/vehicles/:id/calls` | `{ outcome: CallOutcome, durationSeconds? }` |

`GET` filtra `veiculos.estado IN ('new','interested')` **e** vendedor fora
de cooldown: `NOT EXISTS (SELECT 1 FROM interacoes [N] WHERE vendedor_id =
v.vendedor_id AND criado_em > now() - cooldown_horas)`, `nao_perturbe =
false` e `mutado = false` em `vendedores` [N]. `cooldown_horas` vem de
`configuracoes.cooldown_vendedor_horas` [N].

`POST .../calls`: grava `interacoes` [N] (`resultado` obrigatório no
body — o modal da Fase 1 já não deixa fechar sem escolher, isso é o
espelho no backend). Resultado `agreed_to_bring` move `veiculos.estado`
para `negotiating`; `not_interested`/`wrong_number` para `discarded` com
motivo automático; os demais mantêm o estado. 422 se `outcome` ausente.

## 5. Clientes e interesses (`/clientes`, `/clientes/:id`)

| Método | Rota | Params/Body |
|---|---|---|
| GET | `/api/customers` | `cursor?`, `limit?` |
| GET | `/api/customers/:id` | — |
| POST | `/api/customers` | `Omit<Customer, "id"|"createdAt">` |
| PATCH | `/api/customers/:id` | `Partial<Customer>` |
| POST | `/api/customers/:id/interests` | `Omit<Interest, "id"|"customerId">` |
| PATCH | `/api/interests/:id` | `Partial<Interest>` |

`GET /api/customers` item: `Customer` + contagem de interesses e de
matches (agregado de `interesses` [N] + `matches_interesse` [N]).

`GET /api/customers/:id`: `Customer` + `Interest[]`, cada um com
`InterestMatch[]` já resolvido pro veículo (join com `veiculos`/
`anuncios` [E]/[N] pra mostrar marca/modelo/preço sem round-trip extra).

Criar/editar interesse enfileira o job `match:interesse` (seção 10) — ele
roda contra `interesses` [N] com `status='active'`, grava
`matches_interesse` [N]. Não há endpoint manual de "rodar match agora":
seção 10 descreve o job como automático por veículo novo/atualizado; via
API só disparo indireto ao criar/editar interesse.

## 6. Solicitações (`/solicitacoes`)

| Método | Rota | Params/Body |
|---|---|---|
| GET | `/api/requests` | `cursor?`, `limit?`, `state?`, `branchId?` |
| PATCH | `/api/requests/:id` | `Partial<Pick<AcquisitionRequest, "state"\|"checklist"\|"lossReason"\|"notes">>` |
| GET | `/api/branches` | — |

`GET /api/requests` item: `AcquisitionRequest` + `Vehicle` resumido
(marca/modelo/preço) + `Branch`. Fonte: `solicitacoes_captacao` [N] +
`veiculos`/`anuncios` [N]/[E] + `unidades` [N].

`PATCH`: 422 se `state` for `"closed"` e `checklist` tiver algum item
`false` (seção 11: "não fecha sem checklist completo" — validado no
servidor, não só na UI). Toda transição de `state` grava
`auditoria`? — não: seção 15.11 só audita revelar/descartar/mudar peso
(ver `MODELO.md`); transição de solicitação **não** entra em `auditoria`,
mas dispara webhook `solicitacao.mudou_estado` [N] `webhook_entregas`.

`GET /api/branches`: `Branch[]` + contagem de solicitações no período
corrente por unidade (pro aviso de limite — seção 11: "não adianta
agendar 8 carros na mesma manhã").

## 7. Vendedores (`/vendedores`, `/vendedores/:id`)

| Método | Rota | Body |
|---|---|---|
| GET | `/api/sellers` | — |
| GET | `/api/sellers/:id` | — |
| PATCH | `/api/sellers/:id` | `{ muted?: boolean, doNotDisturb?: boolean }` |
| POST | `/api/sellers/:id/reveal-contact` | — |

`GET /api/sellers` item: `Seller` [N] (telefone sempre mascarado —
`contatos_vendedor` [N] nunca sai em lista, só via `reveal-contact`
pontual e auditado).

`PATCH`: mudar `muted` "silencia todos os anúncios dele de uma vez"
(seção 7.2) — na prática filtra esse `vendedor_id` da `fila_do_dia` [N]
sem alterar o `estado` de cada `veiculos` individual (efeito é de
apresentação, não de dado).

## 8. Revisão de match FIPE (`/revisao-fipe`)

| Método | Rota | Params |
|---|---|---|
| GET | `/api/fipe-review` | `cursor?`, `limit?` |
| POST | `/api/vehicles/:id/fipe-match/confirm` | igual à seção 3 |

`GET` filtra `veiculos` [N] onde `fipeMatchConfidence IS NULL OR
BETWEEN 0.60 AND 0.85`. Cada item inclui `fipeMatchCandidates` [W] — os
até 3 candidatos vêm calculados e persistidos no momento da normalização
(seção 8: marca por dicionário → modelo por trigram → versão por token →
filtro ano/combustível), não recalculados na hora do GET.

## 9. Fontes (`/fontes`)

| Método | Rota | Body |
|---|---|---|
| GET | `/api/sources` | — |
| GET | `/api/sources/:source/runs` | `cursor?`, `limit?` |
| PATCH | `/api/sources/:source` | `{ active: boolean }` |
| POST | `/api/sources/:source/run` | `{ sellerType?: "individual"\|"dealer", limit?: number }` |

`GET /api/sources`: `Source` [E] (`fontes`) + última linha de
`scrape_runs` [E] por fonte + `pendingRequest` (última linha não
processada de `execucoes_solicitadas` [N], Fase 4).

`PATCH`: 403 se `source` não for `shopcar` — `webmotors` e `olx` não têm
self-service de ligar por API (CLAUDE.md: "não ligue por conta própria");
a mudança delas só acontece por migration/config manual depois de
homologação (`webmotors`) ou nunca via automação (`olx`, modo manual por
definição). O toggle da tela em Fase 1 já nasceu travado pra essas duas —
isso é só o espelho no backend.

`POST .../run` (Fase 4, botão "Rodar coleta agora"): mesma trava do
`PATCH` — 403 se `source` não for self-service. 409 se já existe pedido
pendente pra essa fonte (`processado_em IS NULL`), pra não empilhar clique.
Grava linha em `execucoes_solicitadas` [N] e retorna 202 — **não** dispara
a coleta: não é RPC (SPEC seção 5), é o coletor Python que lê essa tabela
quando roda (`captacao_bot.cli pedidos --fonte <fonte>`, hoje só manual;
agendamento em produção é decisão de infra, seção 5 do SPEC — "orquestrador
de produção em aberto").

## 10. Ajustes (`/ajustes`)

| Método | Rota | Body |
|---|---|---|
| GET | `/api/settings` | — |
| PUT | `/api/settings` | `Settings` completo |
| GET / POST / PATCH | `/api/branches`, `/api/branches/:id` | `Branch` |
| GET / POST / PATCH | `/api/webhooks`, `/api/webhooks/:id` | `Webhook` (sem `segredo` no GET) |
| GET | `/api/webhooks/:id/deliveries` | `cursor?`, `limit?` |

`GET /api/settings`: `configuracoes` [N] de maior `versao`.

`PUT`: sempre insere `versao + 1` (nunca `UPDATE` — seção "versionados,
sem deploy"). Se `pesos` mudou em relação à versão anterior, grava
`auditoria` [N] `action: "change_weight"` com o diff; as demais mudanças
(motivos, cadência, template) não geram linha de auditoria — o histórico
delas já é a sequência de `versao` (ver justificativa em `MODELO.md`).

`PATCH /api/webhooks/:id`: `segredo` write-only — aceito no `POST`,
nunca devolvido em nenhum `GET` (nem mascarado; simplesmente ausente do
payload).

## 11. Auditoria (`/auditoria`)

| Método | Rota | Params |
|---|---|---|
| GET | `/api/audit` | `cursor?`, `limit?`, `action?`, `author?`, `targetType?`, `from?`, `to?` |

Fonte: `auditoria` [N], ordenado por `criado_em DESC`. Só as três ações da
seção 15.11 aparecem aqui (ver `MODELO.md`); não é um log genérico de toda
mutação do sistema.

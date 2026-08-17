# MODELO.md — Tabelas que faltam (Fase 2)

Cobre a seção 6 do SPEC. `db/schema.sql` já tem `fontes`, `anuncios`,
`preco_historico`, `scrape_runs` — território do coletor, não mexido aqui.
Convenções seguem o schema existente: `bigserial`/`text` para PK, `timestamptz`
em UTC, valores monetários em `bigint` (centavos), `text[]` onde já há
precedente. Nomes de tabela e coluna em português, como o resto do banco —
só o código TypeScript usa inglês (CLAUDE.md).

Nenhuma migration aqui. Isso é insumo para a Fase 3.

## Veículo canônico

### `veiculos`
Registro pós-dedupe. Campos descritivos (marca, km, preço) **não** ficam
aqui — vêm do `anuncio_principal` ou da view `fila_do_dia` abaixo. Duplicar
esses campos em `veiculos` criaria duas fontes da verdade toda vez que o
anúncio principal mudasse.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `fingerprint` | text | marca+modelo+ano_modelo+faixa_km+cor+cidade (mesma regra do coletor, `pipeline.py`) |
| `anuncio_principal_id` | bigint FK `anuncios.id` | anúncio mais completo/recente entre os ligados |
| `vendedor_id` | bigint FK `vendedores.id`, nullable | nulo até a normalização resolver o vendedor |
| `estado` | text | espelho do último `estados_veiculo` — denormalizado de propósito, ver justificativa do índice |
| `motivo_descarte` | text, nullable | obrigatório quando `estado = 'discarded'` (checado na aplicação, não no banco) |
| `gatilho_retorno_tipo` | text, nullable | `price_drop` \| `days_elapsed` |
| `gatilho_retorno_valor` | numeric, nullable | `7` (%) ou `30` (dias) — vem de `configuracoes` no momento do descarte |
| `criado_em`, `atualizado_em` | timestamptz | |

**Índices**
- `UNIQUE (fingerprint)` — é a chave de dedupe: o pipeline de `normalize`
  faz `INSERT ... ON CONFLICT (fingerprint)` para decidir se agrega a um
  veículo existente ou cria um novo. Sem unique, dedupe vira race condition.
- `btree (vendedor_id)` — ficha do vendedor lista "outros carros dele".
- `btree (estado) WHERE estado NOT IN ('discarded','lost')` — parcial,
  mesma lógica do `ix_anuncios_ativos` do coletor: a maioria das leituras
  quer só veículo em trabalho.

### `anuncio_veiculo`
N:N conforme SPEC. Na prática um anúncio some para um veículo só, mas o
fluxo de revisão de dedupe (ambíguo, fase futura) pode reatribuir — por
isso é tabela de junção e não uma FK direta em `anuncios`.

| Coluna | Tipo | Nota |
|---|---|---|
| `anuncio_id` | bigint FK `anuncios.id` | |
| `veiculo_id` | bigint FK `veiculos.id` | |
| `criado_em` | timestamptz | |

**Índices**
- `UNIQUE (anuncio_id)` — invariante do produto: um anúncio pertence a no
  máximo um veículo *agora*. Reatribuição é um DELETE+INSERT, não um
  segundo vínculo simultâneo.
- `btree (veiculo_id)` — ficha do veículo lista "anúncios ligados"; sem
  isso é seq scan em `anuncio_veiculo` a cada carregamento de ficha.

## FIPE

### `fipe_marcas`, `fipe_modelos`, `fipe_anos`
Espelham a hierarquia oficial da tabela FIPE (marca → modelo → ano/combustível).

| Tabela | PK | FK | Índice extra |
|---|---|---|---|
| `fipe_marcas` | `codigo` text | — | — |
| `fipe_modelos` | `codigo` text | `marca_codigo → fipe_marcas` | `btree (marca_codigo)` — listar modelos de uma marca no import mensal |
| `fipe_anos` | `codigo` text | `modelo_codigo → fipe_modelos` | `btree (modelo_codigo)` — mesma razão |

`fipe_anos.ano_modelo` usa `32000` como sentinela de "zero km", convenção
da própria FIPE — evita inventar um campo booleano `zero_km` à parte.

### `fipe_precos`
| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `fipe_ano_codigo` | text FK `fipe_anos.codigo` | |
| `mes_referencia` | text | `"2026-07"` |
| `valor` | bigint | centavos |

**Índices**
- `UNIQUE (fipe_ano_codigo, mes_referencia)` — chave natural do import
  mensal; o job de ingestão faz upsert nela, nunca duplica um mês.
- `btree (mes_referencia)` — o job de import lê/substitui um mês inteiro
  de cada vez (seção 8: "tabela inteira importada... por mês").

### `fipe_aliases`
Alimentada pela confirmação manual na tela de Revisão de match FIPE.

| Coluna | Tipo | Nota |
|---|---|---|
| `padrao_texto` | text PK | título normalizado que gerou o match ambíguo |
| `fipe_ano_codigo` | text FK `fipe_anos.codigo` | |
| `confirmado_por` | text | |
| `confirmado_em` | timestamptz | |

PK dupla como índice: é exatamente a chave de lookup do `lib/fipe-match.ts`
antes de rodar trigram — "essa string eu já vi, é isso aqui" em O(1).

## Score

### `scores`
Uma linha por veículo (a mais recente sobrescreve — seção 9 não pede
histórico de score, só o breakdown atual). Se precisar de tendência depois,
vira tabela `scores_historico` aditiva, sem migração destrutiva.

| Coluna | Tipo | Nota |
|---|---|---|
| `veiculo_id` | bigint PK, FK `veiculos.id` | |
| `total` | smallint | 0–100 |
| `faixa` | text | `quente\|boa\|morna\|fria`, derivado de `total` + `configuracoes.faixas` |
| `componentes` | jsonb | array de `{chave, rotulo_valor, pontos}` — seção 9 |
| `calculado_em` | timestamptz | |

PK em `veiculo_id` já serve de índice; é sempre um lookup direto pela
ficha ou pela `fila_do_dia`.

## Estado de trabalho

### `estados_veiculo`
Histórico append-only. `veiculos.estado` é o ponteiro pro estado mais
recente daqui — permite a tela de Descartados reverter (insere uma nova
linha) sem perder o motivo original, e dá a timeline da ficha de graça.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `veiculo_id` | bigint FK `veiculos.id` | |
| `estado` | text | valores do `VehicleState` (`packages/types/domain.ts`) |
| `motivo` | text, nullable | obrigatório quando `estado = 'discarded'` |
| `autor` | text | |
| `criado_em` | timestamptz | |

**Índices**
- `btree (veiculo_id, criado_em DESC)` — timeline da ficha e "estado
  anterior" para o botão reverter; sem isso cada ficha varre a tabela toda.

## Vendedor e contato

### `vendedores`
Telefone **não** mora aqui — seção 4.6 exige isolamento, TTL e auditoria
de revelação, então fica em `contatos_vendedor`. Aqui só o hash, que serve
tanto pra dedupe quanto pra checar `bloqueio_contato` sem tocar no dado
pessoal bruto.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `nome` | text | |
| `telefone_hash` | text | `sha256(telefone_e164)` |
| `mutado` | boolean default false | |
| `nao_perturbe` | boolean default false | |
| `criado_em`, `atualizado_em` | timestamptz | |

**Índices**
- `UNIQUE (telefone_hash)` — é a chave de dedupe ("vendedor com 14
  anúncios" só funciona se todo anúncio dele cair no mesmo `vendedores.id`).

### `contatos_vendedor`
Isolada de propósito (seção 4.6): dá pra excluir o telefone numa ação só
sem apagar o histórico de interações do vendedor.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `vendedor_id` | bigint FK `vendedores.id` | |
| `telefone_e164` | text | único lugar do banco com telefone em claro |
| `fonte_primeira_coleta` | text | qual `fontes.fonte` originou o dado |
| `ttl_expira_em` | timestamptz | job de limpeza periódica apaga ao vencer |
| `criado_em` | timestamptz | |

**Índices**
- `UNIQUE (vendedor_id)` — 1:1 na prática; tabela separada por controle de
  acesso, não por cardinalidade.
- `btree (ttl_expira_em)` — o job de expiração varre "vencidos até agora",
  não a tabela toda.

### `bloqueio_contato`
Sobrevive à exclusão de `contatos_vendedor` — é o que impede a mesma
pessoa de ser recoletada depois que pediu pra sair.

| Coluna | Tipo | Nota |
|---|---|---|
| `telefone_hash` | text PK | mesmo hash de `vendedores.telefone_hash` |
| `motivo` | text | |
| `criado_em` | timestamptz | |

PK já é o índice: o pipeline de normalização faz um lookup por hash antes
de gravar novo vendedor.

### `interacoes`
| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `veiculo_id` | bigint FK `veiculos.id` | |
| `vendedor_id` | bigint FK `vendedores.id` | |
| `canal` | text | `phone\|whatsapp` |
| `resultado` | text, nullable | `CallOutcome` do domain.ts |
| `duracao_segundos` | integer, nullable | |
| `autor` | text | |
| `criado_em` | timestamptz | |

**Índices**
- `btree (vendedor_id, criado_em DESC)` — hot path: todo card do Discador
  e da Fila precisa saber se o vendedor está em cooldown de 24h. Sem esse
  índice é um scan por card renderizado.
- `btree (veiculo_id, criado_em DESC)` — timeline da ficha.

## Clientes, interesses e casamento

### `clientes`
| Coluna | Tipo |
|---|---|
| `id` | bigserial PK |
| `nome`, `contato`, `origem`, `responsavel` | text |
| `observacoes` | text, nullable |
| `criado_em` | timestamptz |

Sem índice além da PK — tabela de compradores internos, cresce devagar
(dezenas/centenas, não milhões). Revisitar se um dia isso mudar.

### `interesses`
| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `cliente_id` | bigint FK `clientes.id` | |
| `marca`, `modelo`, `cambio`, `cidade` | text, nullable | |
| `ano_min`, `ano_max` | smallint, nullable | |
| `km_maximo` | integer, nullable | |
| `preco_min`, `preco_max` | bigint, nullable | centavos |
| `prioridade` | text | `high\|medium\|low` |
| `validade_ate` | timestamptz, nullable | |
| `status` | text | `active\|paused\|fulfilled` |
| `criado_em` | timestamptz | |

**Índices**
- `btree (cliente_id)` — ficha do cliente.
- `btree (marca, modelo) WHERE status = 'active'` — parcial; é o índice que
  o job `match:interesse` usa pra achar candidatos a cada veículo
  novo/atualizado, sem varrer interesses pausados/atendidos.

### `matches_interesse`
| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `interesse_id` | bigint FK `interesses.id` | |
| `veiculo_id` | bigint FK `veiculos.id` | |
| `score_aderencia` | smallint | 0–100 |
| `estado` | text | `suggested\|accepted\|discarded` |
| `criado_em` | timestamptz | |

**Índices**
- `UNIQUE (interesse_id, veiculo_id)` — o job roda a cada veículo
  novo/atualizado; sem unique, cada rerun duplicaria o match.
- `btree (veiculo_id)` — ficha do veículo mostra "N clientes procurando";
  a unique acima já cobre a busca por `interesse_id`.

## Solicitação de veículo na loja

### `unidades`
| Coluna | Tipo |
|---|---|
| `id` | bigserial PK |
| `nome`, `endereco` | text |
| `limite_veiculos_por_periodo` | integer |

Sem índice extra — poucas lojas.

### `solicitacoes_captacao`
Checklist como `jsonb` porque a seção 11 pede checklist *editável*: virar
6 colunas booleanas fixas trava a configuração; `jsonb` deixa o item novo
no formulário de Ajustes sem migration.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `veiculo_id` | bigint FK `veiculos.id` | |
| `vendedor_id` | bigint FK `vendedores.id` | |
| `cliente_id` | bigint FK `clientes.id`, nullable | |
| `unidade_id` | bigint FK `unidades.id` | |
| `responsavel` | text | |
| `data_hora_proposta` | timestamptz | |
| `estado` | text | `AcquisitionRequestState` do domain.ts |
| `motivo_perda` | text, nullable | |
| `observacoes` | text, nullable | |
| `checklist` | jsonb | `{documento, chaveReserva, manual, vistoria, fotosPadronizadas, avaliacao}` |
| `criado_em`, `atualizado_em` | timestamptz | |

**Índices**
- `btree (estado)` — a tela é um kanban por estado; sem índice cada coluna
  do kanban é um seq scan.
- `btree (unidade_id, data_hora_proposta)` — agenda por unidade com limite
  por período (seção 11): a checagem "quantos veículos já agendados nesse
  intervalo" é um range scan neste índice, não uma varredura.
- `btree (veiculo_id) WHERE estado NOT IN ('closed','declined')` — parcial;
  evita solicitação duplicada em aberto pro mesmo veículo.

## Configuração, auditoria, webhooks

### `configuracoes`
Versionado por append — "editável sem deploy" (princípio 2) não implica
mutação in-place; cada save é uma linha nova, a de maior `versao` é a
vigente. Isso também é o histórico de mudança de peso exigido pela
auditoria, sem duplicar dado.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `versao` | integer | |
| `pesos`, `curva_km` | jsonb | arrays de `{chave, peso}` / `{ano_modelo, km_medio}` |
| `faixas` | jsonb | `{quente, boa, morna}` |
| `motivos_descarte` | jsonb | array de string |
| `gatilho_retorno_pct`, `gatilho_retorno_dias` | numeric, integer | |
| `cooldown_vendedor_horas` | integer | |
| `follow_up_dias` | jsonb | `[2, 7]` |
| `template_whatsapp` | text | |
| `horario_permitido_inicio`, `horario_permitido_fim` | time | |
| `autor`, `criado_em` | text, timestamptz | |

**Índices**
- `btree (versao DESC)` — buscar a config vigente é sempre "maior versão";
  tabela pequena (uma linha por mudança de ajuste), mas o índice deixa o
  `LIMIT 1` O(log n) em vez de sort completo.

### `auditoria`
Seção 15.11 só exige rastrear três ações (revelar contato, descartar,
mudar peso) — é o que popula essa tabela; as demais mudanças de
`configuracoes` não geram linha aqui porque já têm histórico via `versao`.

| Coluna | Tipo |
|---|---|
| `id` | bigserial PK |
| `acao` | text (`AuditAction` do domain.ts) |
| `autor` | text |
| `alvo_tipo`, `alvo_id` | text |
| `detalhe` | text |
| `criado_em` | timestamptz |

**Índices**
- `btree (criado_em DESC)` — a tela lista em ordem cronológica reversa por
  padrão.
- `btree (alvo_tipo, alvo_id)` — ficha de veículo/vendedor mostra o
  histórico de auditoria daquele alvo específico.

### `webhooks`
| Coluna | Tipo |
|---|---|
| `id` | bigserial PK |
| `url` | text |
| `eventos` | jsonb (array de string) |
| `ativo` | boolean |
| `segredo` | text — nunca sai em resposta de API |
| `criado_em`, `atualizado_em` | timestamptz |

Sem índice extra — poucos webhooks configurados por operação.

### `webhook_entregas`
Não está nomeada na lista da seção 6, mas a seção 13 exige "log de
entrega visível na UI" e "retry com backoff" — sem uma tabela de entregas
isso não é implementável. Decisão registrada aqui em vez de inventar em
silêncio.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `webhook_id` | bigint FK `webhooks.id` | |
| `evento` | text | |
| `payload` | jsonb | |
| `tentativa` | smallint | |
| `status_http` | integer, nullable | |
| `sucesso` | boolean | |
| `criado_em` | timestamptz | |

**Índices**
- `btree (webhook_id, criado_em DESC)` — log de entrega por webhook, mais
  recente primeiro.
- `btree (criado_em) WHERE sucesso = false` — parcial; é o índice que o
  job de retry usa pra achar entregas pendentes sem varrer as que já
  tiveram sucesso.

## View materializada `fila_do_dia`

Exigida explicitamente pela seção 14 ("materialized view fila_do_dia com
refresh a cada `<<10 min>>`"). Junta `veiculos` + `anuncio_principal`
(de `anuncios`) + `scores` + campos FIPE, denormalizado — é o que dá ao
`GET /api/queue` e ao `GET /api/vehicles/search` (docs/API.md) os campos
prontos pra filtrar/ordenar sem join em tempo de request.

**Índices sobre a view** (literal da seção 14):
- `btree (estado, score DESC, id)` — composto; é o índice da Fila do dia
  em si, ordenação por oportunidade dentro de cada estado de trabalho.
- `GIN (titulo_normalizado gin_trgm_ops)` — busca por texto livre na tela
  de Busca.
- `btree (desconto_fipe_pct)`, `btree (ano_modelo)`, `btree (preco)`,
  `btree (km)` — cada um é um filtro/ordenação distinto na Busca; a seção
  14 os lista nominalmente.

`<<10 min>>` é o intervalo de refresh sugerido no SPEC (seção 18, parâmetro
a definir) — mantive o valor default e deixei configurável, mesma lógica
aplicada aos outros parâmetros `<<>>` no mock da Fase 1.

## Coleta sob demanda (Fase 4)

### `execucoes_solicitadas`
Fila do botão "Rodar coleta agora" da tela Fontes. Não é RPC — a API só
grava a linha (SPEC seção 5: fronteira TS/Python é o Postgres); o coletor
Python lê essa tabela quando roda (`captacao_bot.cli pedidos --fonte
<fonte>`), processa e marca `processado_em`/`scrape_run_id`.

`tipo_anunciante` (particular/loja, `anuncios.tipo_anunciante`) não estava
no SPEC original — pedido do usuário na Fase 4. Detectado pelo coletor via
`offers.seller.@type` do JSON-LD (Organization/Person), com fallback de
seletor CSS; fica em `anuncios`, não em tabela própria, por ser 1:1 com o
anúncio (mesmo raciocínio dos campos FIPE em `veiculos`).

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigserial PK | |
| `fonte` | text FK `fontes.fonte` | só fonte self-service (hoje: shopcar) aceita POST |
| `tipo_anunciante_filtro` | text, nullable | `particular`\|`loja`\|null=ambos |
| `limite` | integer, nullable | |
| `solicitado_por` | text | |
| `solicitado_em` | timestamptz | |
| `processado_em` | timestamptz, nullable | null = pendente |
| `scrape_run_id` | bigint FK `scrape_runs.id`, nullable | preenchido ao processar |

**Índice**: `btree (fonte, solicitado_em DESC) WHERE processado_em IS NULL`
— parcial; é exatamente a pergunta que a rota de trigger faz ("já tem
pedido pendente pra essa fonte?") antes de aceitar um novo.

## Fora de escopo desta fase

Nenhuma migration foi escrita. `EXPLAIN ANALYZE` das queries novas fica
para a Fase 3, quando `db/schema.sql` ganhar essas tabelas de verdade e
houver dado pra explicar contra — rodar `EXPLAIN` numa tabela vazia não
diz nada sobre o plano real.

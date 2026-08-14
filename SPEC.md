# SPEC — Plataforma de captação de veículos (repasse / consignação)

## 1. Problema

Compradores de repasse garimpam veículos manualmente em classificados. O
processo é lento, sem memória (o mesmo carro reaparece toda semana) e sem
referência: não se sabe se o preço está abaixo da FIPE, há quantos dias o
anúncio está no ar, nem se alguém do time já ligou naquele vendedor.

A plataforma coleta, normaliza, deduplica, casa com a FIPE, ranqueia por
oportunidade, entrega uma fila de trabalho pronta para ligar e — quando existe
cliente interessado — organiza a vinda do veículo até a loja.

## 2. Princípios

1. **Nada aparece duas vezes.** Anúncio já visto não volta para a fila, salvo
   se algo relevante mudar (preço caiu, voltou ao ar).
2. **O usuário controla tudo.** Pesos, regras de descarte, fontes, cadência,
   limiares — editáveis na interface, versionados, sem deploy.
3. **Nenhum número sai do nada.** Todo score mostra seus componentes.
4. **A fila é a tela principal.**
5. **Sistema autônomo.** A plataforma é dona de todo o seu dado. Integração
   externa é opcional, sai por webhook assinado, e nada interno depende dela.

## 3. Escopo

**Dentro**: coleta multi-fonte; normalização; dedupe; match FIPE; histórico de
preço; score de oportunidade; fila de trabalho; discador; cadastro de clientes
compradores e seus interesses; casamento automático carro × interesse;
solicitação de veículo na loja; administração completa; export e webhooks.

**Fora (v1)**: app mobile nativo; billing multi-tenant; precificação de venda ao
consumidor final; contrato e financeiro.

## 4. Acesso às fontes

### 4.1 Hierarquia (sempre nesta ordem)

| Nível | O que é | Estabilidade |
|---|---|---|
| 1 | Feed/API oficial ou XML de estoque | Alta |
| 2 | Acesso autorizado (parceria, integrador homologado, permissão escrita) | Alta |
| 3 | Página pública, coleta educada, dentro do `robots.txt` | Média |
| 4 | — | Fora de escopo (4.4) |

Adapter sem nível e base legal declarados não sobe: a config do coletor rejeita
em tempo de carga (`AdapterConfig.__post_init__`).

### 4.2 Fontes iniciais

- **shopcar.com.br** — Nível 3, ativa. Portal pequeno, sem proteção comercial
  anti-bot. Começa por aqui: valida o pipeline inteiro sem briga.
- **webmotors.com.br** — Nível 2 possível, **desligada**. As APIs do portal de
  desenvolvedores servem o estoque do lojista que autoriza a integração, não o
  marketplace. Só liga após homologação.
- **olx.com.br** — Modo manual, **desligada**. A API pública é de publicação de
  anúncio, não de leitura do marketplace. O usuário cola a URL no painel e o
  item entra no mesmo pipeline.

### 4.3 Boa vizinhança (implementado em `services/collector`)

User-Agent identificável com contato; 1 conexão e 1 requisição a cada 4s com
jitter; `robots.txt` e `Crawl-delay` obedecidos; conditional GET; sitemap antes
de paginar; early stop em 25 conhecidos seguidos; content hash; circuit breaker;
retry ≤ 3 com backoff.

### 4.4 Fora de escopo

Captcha-solving; proxy rotativo para escapar de bloqueio; falsificação de
fingerprint de navegador ou TLS; login em conta de terceiro. Fonte que só
funciona assim muda de nível de acesso ou sai do projeto.

### 4.5 Escalonamento quando bloqueia

Reduzir taxa e ir para janela noturna → conferir robots e trocar listagem por
sitemap → pedir autorização por escrito → desativar e marcar como manual.

### 4.6 Dados pessoais

Telefone e nome de vendedor pessoa física são dado pessoal sob a LGPD, e ligação
ativa é tratamento com finalidade própria. Regras: base legal registrada por
fonte; mascaramento por padrão; revelação auditada; "não perturbe" respeitado em
todo canal; exclusão em uma ação, com telefone mantido em hash na lista de
bloqueio para não recoletar; TTL configurável. Telefone nunca em log nem em
export padrão.

## 5. Stack

- **Front**: Next.js (App Router), TypeScript, Tailwind, shadcn/ui,
  TanStack Query, TanStack Virtual.
- **API**: Node + Fastify + TypeScript + Zod.
- **Coletor**: Python (`services/collector`), já pronto e testado.
- **Fila**: BullMQ + Redis. Jobs: `normalize`, `match:fipe`, `dedupe`, `score`,
  `thumbs`, `match:interesse`, `notify`.
- **Banco**: PostgreSQL 16 com `pg_trgm` e `unaccent`. Migrations versionadas.
- **Deploy**: Docker. Imagens `web`, `api`, `worker`, `collector`. Compose para
  dev. Orquestrador de produção em aberto — nada no código depende dele.

A fronteira entre TypeScript e Python é o Postgres. O coletor escreve, a API lê.
Sem RPC entre os dois.

## 6. Modelo de dados

**Coleta** (já em `db/schema.sql`): `fontes`, `anuncios`, `preco_historico`,
`scrape_runs`.

**A criar**:
- `veiculos` — registro canônico após dedupe, agregando anúncios de várias fontes.
- `anuncio_veiculo` — N:N.
- `fipe_marcas`, `fipe_modelos`, `fipe_anos`, `fipe_precos` — tabela FIPE
  importada por `mes_referencia`.
- `fipe_aliases` — `padrao_texto → fipe_codigo`, alimentada pelas confirmações
  manuais de match.
- `scores` — `veiculo_id`, score, componentes `jsonb`, `calculado_em`.
- `estados_veiculo` — estado de trabalho por veículo (seção 7.2).
- `vendedores` — deduplicado por telefone em E.164.
- `contatos_vendedor` — tabela isolada, TTL, auditoria.
- `bloqueio_contato` — hash de telefone, "não perturbe".
- `interacoes` — canal, resultado, duração, autor.
- `clientes` — comprador interessado (nome, contato, origem, responsável).
- `interesses` — `cliente_id` + critérios (marca, modelo, faixa de ano, km,
  preço, câmbio) + prioridade + status.
- `matches_interesse` — `interesse_id` × `veiculo_id`, score de aderência,
  estado (sugerido, aceito, descartado).
- `unidades` — lojas para recebimento.
- `solicitacoes_captacao` — seção 11.
- `configuracoes` — pesos, limiares e regras, versionados.
- `auditoria` — quem revelou contato, quem descartou, quem mudou peso.
- `webhooks` — endpoints de saída, eventos assinados, log de entrega.

Chave natural do anúncio: `(fonte, id_externo)`. Fingerprint do veículo:
`marca + modelo + ano_modelo + faixa_km + cor + cidade` (preço fora, de
propósito — a diferença de preço entre fontes é o que interessa).

## 7. Controle de estado

### 7.1 Coleta
Ledger no coletor: chave natural única, `content_hash`, early stop, cursor por
fonte, `raw_json` sempre preservado.

### 7.2 Trabalho
`novo → em_analise → interessado → contatado → negociando → solicitado →
captado | perdido | descartado`

- **Descarte permanente**: nunca mais aparece.
- **Descarte com gatilho de retorno**: volta se a condição bater — preço caiu
  `<<7%>>`, ou passaram `<<30 dias>>`.
- Todo descarte exige motivo (lista configurável) e vai para o histórico. Tela
  de Descartados permite reverter.
- **Vendedor mutado**: silencia todos os anúncios dele de uma vez.

Nada é apagado. "Não aparecer" é filtro, nunca delete.

## 8. FIPE

- Tabela inteira importada e versionada por `mes_referencia`. Job mensal.
  Nunca consultar API externa por anúncio — requisito de performance.
- Anúncio de março compara com a FIPE de março.
- **Matching** (`lib/fipe-match.ts`, com testes): limpeza do título → marca por
  dicionário → modelo por trigram → versão por tokens → filtro por ano e
  combustível → confiança 0–1.
  ≥ `<<0.85>>` automático; entre `<<0.60>>` e `<<0.85>>` vai para a fila de
  revisão com 3 candidatos; confirmação manual grava alias e vale dali em
  diante. Sem match: score sai `parcial` e o veículo entra na fila de revisão —
  nunca é descartado em silêncio.
- `desconto_fipe_pct` e `desconto_fipe_reais` são campos de primeira classe:
  indexados, filtráveis, ordenáveis.
- **Preço ajustado por km** (opcional): a FIPE ignora quilometragem. Curva de
  depreciação configurável gera `fipe_ajustada`. A UI mostra os dois e deixa
  claro qual está no filtro.

## 9. Score de oportunidade

0–100, calculado no worker, persistido com componentes em `jsonb`.

| Componente | Sinal |
|---|---|
| Desconto vs FIPE | quanto abaixo da referência |
| Dias no ar | anúncio velho = vendedor mais flexível |
| Quedas de preço | número e magnitude |
| Liquidez do modelo | quão rápido similares somem da base (histórico próprio) |
| Km vs média do ano | abaixo da média para aquele ano/modelo |
| Completude | fotos, descrição, campos preenchidos |
| **Demanda interna** | existe cliente com interesse compatível — peso alto |
| Risco (negativo) | sinistro/leilão declarado, preço bom demais, dados inconsistentes |

Faixas: **Quente** (≥80), **Boa** (60–79), **Morna** (40–59), **Fria** (<40).
Cor + rótulo, nunca só cor. Na ficha, barra por componente com o valor bruto ao
lado ("Desconto FIPE: 14,2% → 28 pts").

Recalculo: mudança de preço, mudança de peso (em massa, com barra de progresso),
e diariamente para os componentes temporais.

## 10. Clientes, interesses e casamento

Sem CRM externo, o comprador interessado vive aqui — e isso destrava a melhor
feature do sistema.

- **Cliente**: nome, contato, origem, responsável, observações.
- **Interesse**: critérios (marca, modelo, faixa de ano, km máximo, faixa de
  preço, câmbio, cidade) + prioridade + validade. Um cliente pode ter vários.
- **Casamento automático**: job `match:interesse` roda a cada veículo novo ou
  atualizado e gera `matches_interesse` com score de aderência. Match forte
  aparece como etiqueta na Fila do dia — "2 clientes procurando" — e alimenta o
  componente **Demanda interna** do score.
- A ordem certa é essa: o carro sobe na fila porque tem comprador esperando, não
  só porque está barato. Carro barato sem demanda é estoque parado.

## 11. Solicitação de veículo na loja

`solicitacoes_captacao`: `veiculo_id`, `vendedor_id`, `cliente_id` (opcional),
`unidade_id`, `responsavel`, `data_hora_proposta`, `estado`, `motivo_perda`,
`observacoes`.

`solicitado → aceito → agendado → veiculo_na_loja → em_avaliacao →
proposta_feita → fechado | recusado | nao_compareceu`

- Ao criar: mensagem pronta para o vendedor (template editável) com modelo,
  horário, endereço da unidade e responsável.
- **Agenda de recebimento** por unidade, com limite de veículos por período —
  não adianta agendar 8 carros na mesma manhã.
- **Checklist de recepção** editável: documento, chave reserva, manual, vistoria,
  fotos padronizadas, avaliação. Não fecha sem checklist completo.
- Lembretes em D-1 e 2h antes, para vendedor e responsável.
- `nao_compareceu` devolve o veículo à fila com etiqueta e cooldown.
- Cada transição emite evento no webhook de saída (seção 13).

## 12. Contato e discador

- Telefone mascarado por padrão; "revelar" gera auditoria.
- **Ligar**: `tel:` na v1, atrás da interface `TelephonyProvider` para plugar
  fornecedor depois sem tocar na UI. Ao encerrar, modal de resultado
  obrigatório: não atendeu / sem interesse / vai pensar / negociando / aceitou
  trazer / número errado. O resultado alimenta o estado do veículo.
- **WhatsApp**: link `wa.me` com mensagem montada de template editável
  (`{{modelo}}`, `{{ano}}`, `{{preco}}`, `{{desconto_fipe}}`), atrás da
  interface `MessagingProvider`. Nada é enviado sem o usuário revisar.
- **Fila de ligação**: um card por vez, atalhos (`L` ligar, `D` descartar,
  `I` interesse, `→` próximo), cooldown de `<<24h>>` por vendedor, follow-ups
  em `<<D+2>>` e `<<D+7>>` misturados na fila com etiqueta própria, horário
  permitido e "não perturbe" respeitados.
- Ficha do vendedor mostra todos os outros carros dele na base. Vendedor
  recorrente é o ativo mais valioso da operação.

## 13. Webhooks de saída

Genéricos, configuráveis na tela de Ajustes. Um endpoint, uma lista de eventos,
um segredo. Payload JSON assinado com HMAC-SHA256 no header `X-Signature`.
Eventos: `veiculo.novo`, `veiculo.preco_caiu`, `match.encontrado`,
`solicitacao.mudou_estado`, `coleta.finalizada`. Retry com backoff, log de
entrega visível na UI. Nenhuma função interna depende de webhook responder.

## 14. Performance

Alvos com 500 mil anúncios: fila **p95 < 300 ms**, busca **p95 < 500 ms**,
ficha **p95 < 250 ms**.

Paginação keyset (`OFFSET` proibido); score, desconto e thumbnails
pré-calculados no worker; índices parciais em `ativo`, composto
`(estado, score DESC, id)`, GIN `pg_trgm` no título, btree em
`desconto_fipe_pct`, `ano_modelo`, `preco`, `km`; materialized view
`fila_do_dia` com refresh a cada `<<10 min>>`; Redis para filtros salvos e
contagens de faceta; thumbnails WebP em 3 tamanhos gerados no worker; lista
virtualizada com prefetch. `EXPLAIN ANALYZE` obrigatório em query nova de fila
ou busca.

## 15. Telas

1. **Fila do dia** — cards ranqueados, badge de oportunidade, % vs FIPE em
   destaque, dias no ar, fonte, etiqueta de demanda ("2 clientes procurando").
   Ações inline: ligar, interesse, descartar com motivo, solicitar na loja.
2. **Busca** — filtros completos, na URL, com filtros salvos nomeados.
3. **Ficha do veículo** — galeria, comparativo FIPE, breakdown do score,
   histórico de preço, anúncios ligados, card do vendedor com os outros carros
   dele, clientes compatíveis, timeline, botão de solicitar.
4. **Discador** — um card por vez, resultado obrigatório.
5. **Clientes e interesses** — cadastro, critérios, carros compatíveis agora.
6. **Solicitações** — kanban por estado, calendário por unidade, checklist.
7. **Vendedores** — lista, ficha, histórico, mute, não perturbe.
8. **Revisão de match FIPE** — pendências, 3 candidatos, um clique.
9. **Fontes** — status, última execução, coletados/novos/erros, cursor, toggle.
10. **Ajustes** — pesos, faixas, motivos e gatilhos de descarte, cadência, curva
    de km, templates, horários, unidades, webhooks.
11. **Auditoria** — quem revelou contato, quem descartou, quem mudou peso.

Todas com estado vazio, loading (skeleton) e erro.

### Casos de borda do mock
Sem foto; sem km; preço 10x fora da curva; mesmo carro em 3 fontes; anúncio
inativo; sem match FIPE; match ambíguo entre 2 versões; título sujo
("GOL 1.0 FLEX COMPLETÃO 15/16 IPVA PAGO!!!"); vendedor com 14 anúncios;
descartado com gatilho já disparado; solicitação `nao_compareceu`; veículo com
6 quedas de preço em 40 dias; veículo com 3 clientes compatíveis; cliente com
interesse sem nenhum match.

## 16. Fases

1. **Fase 1** — Frontend completo com mock. Termina com `RELATORIO.md`.
2. **Fase 2** — `docs/API.md` e `docs/MODELO.md`. Só documento. Aguarda aprovação.
3. **Fase 3** — Migrations, ingestão FIPE, matching, score, API real, worker, e
   o coletor gravando em Postgres com a fonte shopcar ponta a ponta.
4. **Fase 4** — Clientes, interesses, casamento, solicitações, discador, webhooks.
5. **Fase 5** — Demais adapters e otimização contra os alvos da seção 14.

Não avance de fase sem entregar o artefato da anterior.

## 17. Aceite da Fase 1

`npm install && npm run dev` limpo em máquina zerada; 11 telas navegáveis sem
link morto e sem `TODO` visível; zero chamada de rede; mock tipado por
`packages/types/domain.ts`; fila virtualizada com 200+ itens rolando liso;
`npm run build` e `npm run lint` limpos.

## 18. Parâmetros a definir

`<<7%>>` retorno por queda de preço · `<<30 dias>>` retorno por tempo ·
`<<0.85>>` / `<<0.60>>` confiança do match FIPE · `<<24h>>` cooldown de vendedor ·
`<<D+2>>` / `<<D+7>>` cadência de follow-up · `<<10 min>>` refresh da fila.

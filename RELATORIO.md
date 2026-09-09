# RELATORIO — motivo, número do veículo e contato do vendedor

## Feito
- Parecer ganhou o motivo "Não consegui contato". A lista morta e divergente
  que existia em `apps/api/src/lib/consignacao.ts` saiu: o motivo é texto
  livre de propósito e a lista mora só na UI.
- Número do veículo é o próprio `veiculos.id`, mostrado como `#42` no card da
  fila, no do estoque, no kanban, na lista de tratativas, no sheet e na ficha.
- Busca por número: na fila e no kanban, `#42` filtra só pelo número e texto
  solto continua igual; no estoque virou campo "Nº do veículo" no formulário.
  `parseVehicleNumberQuery` está em lib com teste.
- `PUT /api/vehicles/:id/seller` grava nome e telefone que o consignador
  anotou falando com o vendedor. Normaliza para E.164, bate em
  `bloqueio_contato`, deduplica pelo sha256 do telefone e audita sem o número.
  O campo aparece no sheet da tratativa, com o telefone sempre mascarado.
- Migration `0022`: `contatos_vendedor.fonte_primeira_coleta` aceita NULL e
  `edit_seller_contact` entrou no CHECK de `auditoria`.

## Decidido por mim e por quê
- Contato entra pelo sheet da tratativa, não dentro do dialog de parecer.
  No parecer, um telefone recusado travaria o encerramento — e o momento de
  descobrir o número é durante a conversa, não no fim dela.
- `fonte_primeira_coleta` nullable em vez de criar uma fonte `manual` em
  `fontes`: uma linha lá apareceria na tela de Fontes com botão de rodar
  coleta. NULL lê como "não veio de coleta". Não é destrutiva.
- TTL do telefone anotado à mão: 730 dias (`MANUAL_CONTACT_TTL_DAYS`).
- Hash do telefone: sha256 do E.164 com o "+". Ninguém no projeto gravava
  vendedor ainda, então a convenção nasce aqui. Se o coletor um dia escrever
  vendedor, tem que usar `lib/telefone.ts` ou o dedupe quebra calado.
- Telefone que já é de outro vendedor não dá erro: cai no mesmo vendedor,
  que é a regra de dedupe. Mas telefone novo em vendedor que responde por
  outros carros cria vendedor separado, para não mexer em anúncio alheio.
- Nada de valor em runtime foi para `packages/types`: a API compila para
  `dist/` e importa o pacote como `.ts`, então um `const` lá quebraria o
  `npm start`. Por isso a lista de motivos não foi unificada lá.

## EXPLAIN ANALYZE (banco local vazio — vale o plano, não o tempo)
- Fila com `#42`: `Index Scan using ux_fila_do_dia_veiculo`, 0.055 ms.
- Fila com número solto (`2018`): `Seq Scan` — mesmo plano que a busca por
  texto já tinha antes; o `OR veiculo_id` só somou um predicado barato.
- Estoque com `vehicleId`: `Index Scan using ix_fila_do_dia_estado_score`.

## Pendente de decisão sua
- Redeploy do web e da API no Dokploy, e rodar a migration `0022` em produção.

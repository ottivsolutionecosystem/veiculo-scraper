# RELATORIO — hide-on-scroll estável

## Feito
- Topbar/bottomnav voltam ao fluxo fixo (sem hide global).
- Na fila, só o sticky (CoverageBar + filtros) some ao descer,
  via `translate` dentro do mesmo scroll — sem margin negativo,
  sem encolher flex/main.
- Busca curta (< 6 itens): sem scroll aninhado; página sobe no main.
- Hide só com total ≥ 8 na fila + overflow ≥ 280px.

## Decidido
- Esconder topbar/bottomnav encolhia o main → loop de scroll.
  Hide fica só no sticky da fila.

## Pendente de decisão sua
- Nenhuma.

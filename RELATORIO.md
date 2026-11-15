# RELATORIO — scroll com poucos veículos

## Feito
- Só esconde chrome se a lista tiver overflow ≥ 280px.
- Com poucos carros (busca/fila curta), o chrome fica fixo —
  evita o loop esconde→reflow→scrollTop 0→mostra.

## Decidido
- Limiar alto o bastante para cobrir o cabeçalho da fila que some.

## Pendente de decisão sua
- Nenhuma.

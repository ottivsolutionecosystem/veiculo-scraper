# RELATORIO — fling rápido no hide-on-scroll

## Feito
- Hide do sticky da fila via DOM (`transform`), sem setState no scroll —
  evita re-render da lista virtual no meio do momentum.
- Fling grande (≥ 40px num evento) esconde/mostra na hora.
- Revelar exige subida ≥ 56px — bounce do iOS no fling não tremia mais.
- Sem CSS transition no sticky (animação + fling brigava com o compositor).

## Decidido
- Histerese assimétrica: esconder fácil, revelar mais difícil no meio do gesto.

## Pendente de decisão sua
- Nenhuma.

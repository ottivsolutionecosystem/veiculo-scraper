# RELATORIO — PWA: safe area, scroll e teclado

## Feito
- Menu lateral respeita o notch: logo e X abaixo da barra do sistema.
- Hide do chrome no scroll agora é corte seco (sem animar altura). A
  lista virtualizada não remede no meio do dedo.
- Teclado trava o hide. Folha de filtros usa a altura do
  visualViewport. Input/textarea sobem para o centro no foco.
- Sheet mais curto, fade na troca de rota, pílula na barra de baixo,
  toque com scale leve.

## Decidido por mim e por quê
- `interactiveWidget: resizes-content` para o PWA encolher o layout
  com o teclado, em vez de empurrar solto.

## Pendente de decisão sua
- Nada. Redeploy do web.

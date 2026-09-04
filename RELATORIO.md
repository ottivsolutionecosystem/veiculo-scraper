# RELATORIO — chrome mobile da fila

## Feito
- No telefone, a faixa de cima da fila ficou curta: chips no lugar
  dos 3 cards, particular/loja e Filtros na mesma linha, texto de
  ajuda some.
- Ao descer a lista, topbar e filtros somem; ao subir (ou no topo),
  voltam. Barra de baixo não mexe. Desktop igual.
- Scroll escutado na lista virtualizada (é ela que rola, não a
  página). Menu e folha de filtros travam o hide.

## Decidido por mim e por quê
- Enxugar e esconder. Só hide deixava os cards grandes no começo.
- `grid-template-rows` no collapse: a lista ganha a altura, não fica
  buraco. Safe area fica quando a topbar some (notch).

## Pendente de decisão sua
- Nada. Redeploy do web para o celular pegar.

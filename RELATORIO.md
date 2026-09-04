# RELATORIO — acabamento dos módulos e fim do corte na fila

## Feito
- Acabamento visual dos módulos sem tocar em token de cor: `.app-canvas`
  no papel do painel, `Card` com hairline navy/6% e `.card-lift`, tabela
  com cabeçalho em caixa alta, listas grandes dentro de cartão, cartão da
  fila com foto em zoom leve e preço maior, colunas do kanban viraram
  painel, fontes com grade de 6 números, KPI destacado com halo laranja.
  Base (botão, input, select, textarea, tabs, dialog, popover, dropdown)
  padronizada em canto xl/2xl, foco laranja suave e `shadow-lift`.
- Menu mobile: o X padrão do Radix agora depende da prop `showClose` do
  `SheetContent`, não do truque `[&>button]:hidden`.
- Fila: a lista ia só até 4.75rem antes do fim da tela, fatiando um
  cartão branco na reta e deixando um vão morto antes da barra. Agora a
  fila encosta na borda e a lista some por baixo da bottom nav.
- Criei `--bottom-nav-space` (3rem + safe-bottom no telefone, 0 no
  desktop) — a altura real da barra, no lugar do 4.75rem chutado.
- A bottom nav ganhou um degradê de 20px acima dela, do próprio #F7F4F2
  para transparente, para o conteúdo dissolver em vez de ser cortado.

## Decidido por mim e por quê
- Nenhum token de cor mudou. Tudo saiu de `--navy`, `--orange`, `--coral`
  e do cream, só variando opacidade.
- Subi o design-system em vez de retocar módulo a módulo, para não abrir
  divergência entre telas.
- `main:has([data-fill-page])` ficou fora de `@layer` de propósito: em
  cascade layer, `@layer base` perde para a utility `pb-*` do Tailwind
  mesmo tendo mais especificidade.
- A tela do menu com linha laranja que você mandou era o build do commit
  `92ec539`; aquele código saiu em `24c4ef5`.

## Pendente de decisão sua
- Redeploy do web no Dokploy — sem isso o celular segue no build velho.

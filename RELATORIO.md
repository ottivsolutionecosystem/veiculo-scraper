# RELATORIO — menu, teclado do login, animações

## Feito
- Menu mobile: saiu a faixa laranja do topo. O X agora é um ícone
  simples ao lado da wordmark, sem anel laranja de foco.
- Login: fundo navy fixo no html/body (o cream aparecia no vão do
  teclado). `color-scheme: dark` pede teclado escuro. O card fica na
  área visível (`visualViewport`), sem `transform` em cima do input.
- Abrir/fechar (sheet, overlay, páginas, bottom nav) mais lento
  (~400–500ms) e overlay mais leve.

## Decidido por mim e por quê
- O anel laranja era o `focus:ring` do shadcn no X. Tirei o ring.
- `min-h-dvh` no login encolhia e deixava o papel cream no lugar do
  teclado. `fixed inset-0` + navy no documento cobre o layout inteiro.

## Pendente de decisão sua
- Redeploy do web. Sem isso o celular continua no build antigo.

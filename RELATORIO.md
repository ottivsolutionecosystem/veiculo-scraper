# RELATORIO — barra de baixo sai de cima do conteúdo

## Feito
- A bottom nav não é mais `fixed`. Ela virou o último item da coluna do
  `DashboardShell`, depois do `<main>`, com `shrink-0`. Ocupa espaço de
  verdade, então não tem como cobrir página nenhuma.
- Tirei o `pb-[...]` do `<main>`, o `data-fill-page`, a regra
  `main:has(...)` e o degradê que eu tinha posto acima da barra — todos
  eram remendo para o problema que agora não existe.
- Altura da barra fixada em `h-14` por item (era `min-h-12` + `py-2`, que
  dava 51px e não batia com o espaço reservado).
- `--bottom-nav-space` (3.5rem + safe-bottom) ficou só para quem flutua
  por cima dela: hoje só o banner de instalar o PWA.
- Antes disso: acabamento visual dos módulos sem tocar em token de cor
  (`.app-canvas`, `Card` com hairline e `.card-lift`, tabela com
  cabeçalho em caixa alta, kanban em painel, fontes com grade de 6
  números, KPI com halo laranja, base de inputs/botões padronizada) e o
  X do menu mobile agora depende da prop `showClose` do `SheetContent`.

## Decidido por mim e por quê
- Reservar espaço com `padding-bottom` no `<main>` não funcionava: o
  wrapper de página é `h-full`, o conteúdo transborda dele, e o WebKit
  não soma o padding do container de scroll nesse caso. Barra no fluxo
  resolve na raiz em vez de calibrar número mágico.
- Nenhum token de cor mudou em nada disso.
- A tela do menu com linha laranja que você mandou era o build do commit
  `92ec539`; aquele código saiu em `24c4ef5`.

## Pendente de decisão sua
- Redeploy do web no Dokploy — sem isso o celular segue no build velho.

# RELATORIO — acabamento visual dos módulos

## Feito
- Papel do painel ganhou `.app-canvas`: dois brilhos radiais bem baixos
  (laranja no topo direito, navy na esquerda) sobre o mesmo cream.
- `Card` agora tem hairline `navy/6%`, canto 2xl e a classe `.card-lift`
  (sobe 2px e ganha sombra no hover, desligada em toque).
- Tabela: cabeçalho em caixa alta com faixa `navy/2.5%`, linhas com
  divisória mais fina e hover discreto; listas grandes viraram cartão
  com borda e sombra (vendedores, auditoria, tratativas, ranking).
- Fila: card do veículo com foto em zoom leve no hover, preço maior,
  desconto FIPE virou pílula e a meta ganhou separador em ponto.
- Cobertura (Livres/Com tag/Caiu de preço): cartões maiores, filete da
  marca no topo do ativo, rótulo em caixa alta.
- Kanban de tratativas: cada coluna virou painel com contador em pílula
  e filete da marca; o alvo do arraste destaca a coluna inteira.
- Fontes: cartão com filete quando ativa e os números da última execução
  em grade de 6 caixas no lugar de três parágrafos.
- Operação: KPI destacado com halo laranja e número maior.
- Vazio: selo com a marca dentro de moldura e halo laranja.
- Base: botão, input, select, textarea, tabs, dialog, popover e dropdown
  padronizados em canto `xl`/`2xl`, foco laranja suave e sombra nova
  `shadow-lift`.

## Decidido por mim e por quê
- Não mexi em nenhum token de cor. Tudo saiu de `--navy`, `--orange`,
  `--coral` e do cream que já existiam, só em opacidade baixa.
- Preferi subir o design-system (card, tabela, badge, vazio, inputs) em
  vez de retocar módulo a módulo: assim tudo fica igual e não abre
  divergência entre telas.
- Removi o `overflow-x-auto` duplicado das tabelas — o próprio `Table`
  já rola na horizontal.

## Menu mobile (linha laranja e X fora do lugar)
- A tela que você mandou é o build do commit `92ec539`, não o atual:
  aquele código tinha faixa navy da safe area + `auttus-gradient h-[3px]`
  full width + o X padrão do Radix posicionado por CSS. Isso saiu em
  `24c4ef5`; o que está no `deploy` hoje já não tem nada disso.
- Para não voltar, o X padrão da gaveta agora depende da prop
  `showClose` do `SheetContent` em vez do truque `[&>button]:hidden`.
- Aproveitei e desci o cabeçalho do menu 0.75rem abaixo do notch, com o
  X alinhado ao wordmark.

## Pendente de decisão sua
- Redeploy do web no Dokploy — sem isso o celular continua no build velho.

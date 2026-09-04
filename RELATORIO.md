# RELATORIO — PWA: safe area de verdade

## Feito
- O ajuste anterior não resolvia: `p-0` e `env()` zerado deixavam o
  X embaixo do relógio; o hide por `h-0` ainda travava a lista.
- Faixa navy fixa no topo (`--safe-top`, mínimo 3rem no telefone).
  Menu usa a mesma faixa + spacer interno, não padding que o Tailwind
  anula.
- Hide no scroll saiu. Teclado: tirei `resizes-content` e o
  `scrollIntoView` que brigavam com o iOS.

## Decidido por mim e por quê
- Sem env() o PWA reporta 0. `max(3rem, env())` segura o notch.
- Chrome compacto já cabe; esconder a barra não vale o tranco.

## Pendente de decisão sua
- Redeploy do web. Sem isso o celular continua no build antigo.

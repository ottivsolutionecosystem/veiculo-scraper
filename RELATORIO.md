# RELATORIO — env.example por serviço Nixpacks

## Feito
- `deploy/nixpacks/*.env.example` para api, work, web e collector.
- `docs/DEPLOY.md`: coluna de variáveis na tabela Dokploy.

## Decidido por mim e por quê
- `work` repete obrigatórias da api (worker importa `env.ts`) + `BOT_CONTACT_*`
  do coletor no mesmo processo.

## Pendente de decisão sua
- Copiar `work.env.example` no Dokploy e ajustar hostnames/senhas da sua rede.

# RELATORIO — seed admin pelo console

## Feito
- Script `apps/api/scripts/seed-admin.ts`: cria ou atualiza operador `admin`
  (papel `master` por padrão), senha padrão `12345678` via hash scrypt.
- Comandos: `npm run db:seed-admin` (raiz) ou
  `npm run seed:admin --workspace=apps/api`.

## Decidido por mim e por quê
- Idempotente: se `admin` já existe, atualiza senha/nome/papel e reativa.
- Senha padrão `12345678` (8 caracteres, válida no login da UI).

## Pendente de decisão sua
- Rodar no Dokploy (container api) com `DATABASE_URL` definida.
- Rotacionar senha após bootstrap se usar valor simples em produção.

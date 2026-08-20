# RELATORIO — seed admin pelo console

## Feito
- Script `apps/api/scripts/seed-admin.ts`: cria ou atualiza operador `admin`
  (papel `master` por padrão), senha padrão `123` via hash scrypt.
- Comandos: `npm run db:seed-admin` (raiz) ou
  `npm run seed:admin --workspace=apps/api`.

## Decidido por mim e por quê
- Idempotente: se `admin` já existe, atualiza senha/nome/papel e reativa.
- Senha `123` como pedido, com aviso no console: login da UI exige mínimo
  6 caracteres (`auth.ts`); para entrar pela tela use
  `SEED_ADMIN_PASSWORD=123456` ou troque depois em `/entrar`.

## Pendente de decisão sua
- Rodar no Dokploy (container api) com `DATABASE_URL` definida.
- Rotacionar senha após bootstrap se usar valor simples em produção.

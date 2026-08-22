# RELATORIO — COLLECTOR_ENABLED no work

## Feito
- `start-work.sh`: coletor opcional via `COLLECTOR_ENABLED=false` ou omitido se
  `BOT_CONTACT_*` ausentes (collector separado no Dokploy).
- `work.env.example` e `docs/DEPLOY.md` atualizados.

## Decidido por mim e por quê
- Padrão sem `COLLECTOR_ENABLED`: só sobe coletor se `BOT_CONTACT_*` existem —
  evita loop FATAL quando o collector é outro serviço.

## Pendente de decisão sua
- No Dokploy work: `COLLECTOR_ENABLED=false` e redeploy. Logs do collector
  separado devem mostrar `coletor: ciclo pedidos shopcar`.

# RELATORIO — FIPE por placa (APIBrasil)

## Feito
- Provider `plate-lookup` + testes; env `APIBRASIL_TOKEN` / `APIBRASIL_HOMOLOG`.
- Rota pública `GET /api/fipe/by-plate/:plate`.
- Offer editor: debounce na placa → preenche FIPE/cor; lista candidatos;
  cascade manual como fallback.
- Docs API.md + `.env.example` (api / nixpacks).

## Decidido
- APIBrasil tipo `fipe` (~R$0,06/consulta) atrás da API; Parallelum segue
  para cascade manual. Sem token = só cascade (sem erro barulhento na UI).

## Pendente de decisão sua
- Colocar `APIBRASIL_TOKEN` no Dokploy (serviço api) e redeploy.

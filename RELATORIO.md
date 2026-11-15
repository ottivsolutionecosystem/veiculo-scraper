# RELATORIO — filtros ano/preço/câmbio/combustível/carroceria/km

## Feito
- Busca e Fila: ano de–até, preço de–até, km de–até, câmbio,
  combustível, carroceria.
- API `/api/vehicles/search` e `/api/queue` aceitam os novos params.
- Carroceria via tokens em título/modelo (sem coluna no banco).
- Deploy Dokploy (`f03d42b`): crawler-api e crawler-web — Done.

## Decidido
- Carroceria por ILIKE (categoria Shopcar não é persistida).
  Acerta Hatch/Sedan/SUV/Picape quando o texto traz o token;
  falha em SUV sem “SUV” no título. Persistência de `categoria`
  exigiria mexer no coletor — fora do escopo.

## Pendente de decisão sua
- Quer persistir `categoria`/carroceria no coletor + migration?

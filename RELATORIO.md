# RELATORIO — proxy FIPE Parallelum

## Feito
- Rotas públicas `/api/fipe/*` (marcas→modelos→anos→preço) via Parallelum v2.
- Cascade do web deixa de chamar Parallelum/BrasilAPI no browser.

## Decidido
- Fonte gratuita: Parallelum (500 req/dia sem token). Cota no servidor.

## Pendente de decisão sua
- Cadastrar token gratuito Parallelum (1.000/dia) se o volume subir?

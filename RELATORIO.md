# RELATORIO — varredura na captura página a página

## Feito
- Captura assistida acumula `ids_vistos` na `ingestao_url_fila`.
- Ao fechar o intervalo e processar todo o HTML, desativa
  anúncios ativos que não apareceram (nunca DELETE).
- Migration `0025_ingestao_varredura.sql` + scrape_run
  `ingestao_varredura`.
- UI avisa que, ao terminar o intervalo, quem não veio sai da fila.

## Decidido
- O intervalo de páginas da captura = universo da varredura
  (substitui a enumeração completa bloqueada pelo Cloudflare).

## Pendente de decisão sua
- Deploy **crawler-api** (migration) + **crawler-collector**/**work**.
- Na captura, use o intervalo que cobre a listagem inteira
  (ex. 1→última página); senão desativa o que ficou de fora.

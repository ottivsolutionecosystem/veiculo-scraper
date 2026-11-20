# RELATORIO — galeria completa na raspagem + export

## Feito
- **Causa do Baixar “errado”:** a maioria dos anúncios só tinha **1 foto** no banco.
- Shopcar: JSON-LD traz só a capa; o coletor parava nela e **ignorava** `a.fotogroup` (8–10 fotos).
- Coletor agora mescla galeria HTML + JSON-LD/og, filtra logo do site, até 20 fotos.
- Botão mostra `Baixar N fotos` conforme o que já está na ficha.
- API filtra URL de logo/loja no `upgradeListingPhotos`.

## Decidido por mim
- Galeria HTML tem prioridade sobre JSON-LD (capa única).
- Anúncios já gravados com 1 foto só atualizam na **próxima abertura de ficha** (varredura).

## Pendente de você
- Deploy collector (já disparado se commit subir) + nova varredura Shopcar para repor galerias.
- Conferir ficha após scrape: várias thumbs + Baixar N fotos.

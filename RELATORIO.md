# RELATORIO — Link público com avaliação completa

## Feito
- `/o/:token` agora tem placa, FIPE, lance, pneus, fotos e “Enviar avaliação”.
- API + migration `0027_consorcio_oferecimentos` (persistência no Postgres —
  link funciona no celular do cliente).
- Painel e link compartilham o mesmo formulário (`OfferEditor`).

## Decidido
- Cliente completa tudo; consignador só libera na vitrine.
- Fotos ainda em data URL no JSON (S3/R2 depois se pesar).

## Pendente de decisão sua
- Redeploy **api** + **web** (migration sobe com a api).

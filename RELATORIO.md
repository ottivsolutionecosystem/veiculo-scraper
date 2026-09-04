# RELATORIO — telefonia na Auttus (voz no WhatsApp)

## Feito
- `TelephonyProvider` com softphone (token no servidor) e fallback `tel:`.
- Start da ligação audita revelação, checa mute/não perturbe, não loga telefone.
- Discador e ficha discam de verdade; ao desligar, o mesmo modal de parecer.
- Histórico na ficha; player da gravação via API autenticada (sem URL crua).
- Webhook inbound `/api/telephony/inbound` (dedup por delivery id).
- Migration `0021_telefonia.sql` em `interacoes` + `telefonia_entregas`.

## Decidido por mim e por quê
- `@wavoip/wavoip-api` no web: é o SDK oficial do webphone (WebRTC). Sem
  ele a ligação não acontece no browser. UI importa só `SoftphoneClient`.
- Canal `whatsapp` no softphone (é voz no WhatsApp); `phone` no `tel:`.
- Token vai à sessão autenticada — o SDK exige no cliente. Não entra no
  bundle nem em lista.
- Sem token configurado, o app continua útil com `tel:` + parecer.

## Pendente de decisão sua
- `WAVOIP_DEVICE_TOKEN` e `WAVOIP_WEBHOOK_SECRET` no serviço **api**.
- QR do dispositivo + gravação ligada no painel deles.
- Redeploy api + web + `npm run db:migrate` (0021).

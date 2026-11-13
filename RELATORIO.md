# RELATORIO — captura com um botão

## Feito
- Botão **Iniciar captura automática** em Fontes.
- Userscript `public/capturar-shopcar.user.js` (Tampermonkey, 1×):
  percorre busca.php, envia HTML e abre a próxima sozinho.
- Cloudflare continua no browser do usuário (sem GET no servidor).

## Pendente de decisão sua
- Deploy **crawler-web** (+ api se 0024 ainda não rodou).
- Instalar Tampermonkey → abrir `/capturar-shopcar.user.js` →
  recarregar Fontes → um clique em **Iniciar captura automática**.

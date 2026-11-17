# RELATORIO — link público: fotos, contato e termos

## Feito
- Autosave não substitui mais o rascunho local pela resposta da API (fotos/nome/telefone paravam de “sumir”).
- Nome, telefone, lance, quitação e notas: digitação local + debounce/blur.
- Fotos: fila de refs + compressão um pouco maior; API consórcio com `bodyLimit` 16MB.
- Termos saíram da barra fixa; checkbox + enviar ficam no final (após “Seus dados”).
- Contato no público movido para o fim do fluxo, antes dos termos.

## Decidido
- Estado local é a fonte da verdade no preenchimento; só o envio final sincroniza o offer completo da API.
- Sem barra sticky no público — atrapalhava o teclado/visualização no celular.

## Pendente de você
- Deploy de **crawler-api** + **crawler-web** pra valer em prod.
- Smoke no link: anexar 2 fotos, digitar nome/telefone, rolar até o checkbox no fim e enviar.

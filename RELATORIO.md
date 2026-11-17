# RELATORIO — captura loja.php parava na pág. 1

## Feito
- Causa: userscript Tampermonkey só casava `busca.php`; em
  `loja.php?loja=1847` abria a 1ª página e não avançava.
- Userscript 1.3.0: `@match` + path para `loja.php` e `/loja/*`.
- Painel: URL padrão Barbosa =
  https://www.shopcar.com.br/loja.php?loja=1847
- Teste manual: pág.1 e pág.2 da Barbosa abrem e listam anúncios;
  intervalo URL `pagina=1..2` ok.

## Decidido
- Não inventei loja= da Teca/P12 — só Barbosa (link que você passou).

## Pendente de decisão sua
- Commit + redeploy web? (precisa atualizar o script no Tampermonkey
  depois — versão 1.3.0). Links Teca/P12 se tiver.

# captacao_bot

Coletor Python do projeto de captação de veículos. Roda como serviço separado
do painel; conversa com ele pelo Postgres (`schema.sql`).

## Instalar

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export BOT_CONTACT_URL="https://seudominio.com.br/bot"
export BOT_CONTACT_EMAIL="contato@seudominio.com.br"
```

## Comandos

```bash
# 1. O que o robots.txt permite e qual o intervalo efetivo
python -m captacao_bot.cli robots --fonte shopcar

# 2. Salvar uma página real para desenvolver offline
python -m captacao_bot.cli fixture --fonte shopcar --url https://.../veiculo/123

# 3. Rodar o adapter contra o HTML salvo (sem rede)
python -m captacao_bot.cli parse --fonte shopcar --arquivo tests/fixtures/x.html

# 4. Coleta de verdade
python -m captacao_bot.cli coletar --fonte shopcar --limite 20 --dry-run
```

## Antes do primeiro uso em produção

Os seletores CSS em `adapters/shopcar.py` são hipótese — foram escritos sem
acesso à página real. Salve uma fixture (comando 2), ajuste `SELETORES` até o
teste passar contra ela, e só então rode a coleta. **Nunca ajuste seletor
tentando contra o site**: cada tentativa é uma requisição, e é assim que se
toma bloqueio.

O adapter tenta JSON-LD antes de CSS de propósito. Se o site publica
`schema.org/Vehicle` — e muitos classificados publicam, porque o Google pede —
esse caminho sobrevive a redesign e você quase não mexe em seletor.

## O que este coletor faz para não tomar bloqueio

| Mecanismo | Onde | Efeito |
|---|---|---|
| User-Agent identificável com contato | `config.py` | site sabe quem somos e como falar conosco |
| 1 conexão, 1 req a cada 4s + jitter | `http_client.py` | carga desprezível para o site |
| robots.txt + Crawl-delay | `http_client.py` | obedece o limite declarado, mesmo se for maior que o nosso |
| Conditional GET (ETag / Last-Modified) | `http_client.py` | 304 em vez de página inteira |
| Sitemap antes de paginar | `sitemap.py` | centenas de URLs por requisição |
| Early stop | `runner.py` | para ao encontrar 25 conhecidos seguidos |
| Content hash | `models.py` | não reprocessa o que não mudou |
| Circuit breaker | `http_client.py` | pausa em vez de insistir; desativa depois de 3 pausas |
| Retry ≤ 3 com backoff | `http_client.py` | sem retry storm |

## O que este coletor NÃO faz

Sem captcha-solving, sem proxy residencial rotativo, sem falsificação de
fingerprint de navegador ou TLS, sem login em conta de terceiro. Adapter que
precisaria disso não é escrito: a fonte muda de nível de acesso ou sai.

## Quando uma fonte bloqueia

1. Reduzir a taxa pela metade e mover para janela noturna (`janela_coleta`).
2. Conferir aderência ao `robots.txt`; trocar paginação por sitemap.
3. Pedir autorização por escrito, apresentando bot, volume e finalidade.
   Registrar a resposta em `adapters/<fonte>/README.md`.
4. Sem resposta ou negativa: desativar a fonte e marcar como manual.

## Situação das três fontes

- **shopcar** — ativa, nível público educado. Comece por aqui: valida o
  pipeline inteiro sem briga.
- **webmotors** — desligada. Só liga após homologação no portal de
  desenvolvedores. A API entrega o estoque do lojista que autoriza, não o
  marketplace.
- **olx** — desligada, modo manual. A API pública da OLX é de publicação de
  anúncio, não de leitura do marketplace. O usuário cola a URL no painel e o
  item entra no mesmo pipeline.

## Testes

```bash
pytest -q
```

75 testes, todos offline. Nenhum toca a internet: `httpx.MockTransport` para
rede, fixtures em `tests/fixtures/` para HTML, relógio falso para o rate limit.
Teste que depende de rede falha na sexta e ninguém sabe por quê.

## Dados pessoais

O adapter não coleta telefone de vendedor. Contato entra pelo fluxo com base
legal registrada, mascaramento por padrão e auditoria de acesso (seção 4.7 do
SPEC). Telefone raspado de portal e usado em ligação ativa é o maior risco
jurídico da operação — maior que bloqueio.

# veiculo-scraper

Plataforma de captação de veículos para repasse/consignação: coleta anúncios de
classificados, normaliza, deduplica, compara com a FIPE, ranqueia por
oportunidade e organiza o contato com o vendedor até o veículo chegar na loja.

## Estrutura

| Caminho | O que é |
|---|---|
| `SPEC.md` | Especificação do produto. Leia primeiro. |
| `CLAUDE.md` | Regras de trabalho no repositório. |
| `PROMPT.md` | Mensagens prontas para o Claude Code, fase por fase. |
| `db/schema.sql` | Tabelas da coleta. |
| `services/collector/` | Coletor Python. Pronto e testado. |
| `apps/`, `packages/` | Frontend e API. A construir (Fase 1). |

## Começar

```bash
cd services/collector
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest -q
```

Depois abra o Claude Code na raiz e cole o bloco da Fase 1 do `PROMPT.md`.

## Estado atual

- Coletor Python: pronto, 75 testes offline.
- Fonte `shopcar`: ativa (seletores precisam ser validados contra HTML real).
- Fontes `webmotors` e `olx`: desligadas por decisão de projeto — ver seção 4 do SPEC.
- Frontend, API e worker: não existem ainda.

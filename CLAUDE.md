# Regras de trabalho neste repositório

## Estrutura
- `apps/web` — Next.js (App Router), TypeScript, Tailwind, shadcn/ui.
- `apps/api` — Fastify + TypeScript + Zod.
- `packages/types` — tipos de domínio. Fonte da verdade para web, api e mocks.
- `services/collector` — coletor Python. **Território fechado**: não reescrever,
  não migrar de linguagem, não alterar sem pedido explícito.
- `db/` — schema e migrations.
- `docs/` — documentos das fases 2+.

Projeto autônomo. Não existe sistema externo, CRM de terceiro ou plataforma
legada. Se um requisito parecer pedir integração externa, pergunte antes.

A fronteira entre TypeScript e Python é o Postgres. O coletor escreve, a API lê.
Não invente RPC entre os dois.

## Como eu trabalho
- Execute. Decisão reversível: decida, registre em RELATORIO.md e siga.
  Só pare se estiver bloqueado por informação que só eu tenho.
- Entregue completo. Nada de "aqui está o esqueleto, quer que eu continue?".
- Português do Brasil em UI, comentários, commits e documentos.
- Não avance de fase sem entregar o artefato da anterior.

## Código
- TypeScript estrito. `any` só com comentário justificando.
- `packages/types/domain.ts` é a fonte da verdade. Se um tipo muda, muda ali.
- Sem regra de negócio em componente. Vai para `lib/` com teste.
  Obrigatoriamente testados: `dedupe`, `fipe-match`, `score`,
  `regras-descarte`, `match-interesse`.
- Fornecedor externo sempre atrás de interface (`TelephonyProvider`,
  `MessagingProvider`). A UI nunca conhece o fornecedor.
- Componente acima de ~150 linhas: quebre.
- Nomes em inglês no código, textos de interface em português.

## Dados e performance
- Toda query de lista usa cursor. `OFFSET` é proibido.
- Score, desconto FIPE e thumbnail são pré-calculados no worker. Nada disso em
  tempo de request.
- Query nova de fila ou busca: `EXPLAIN ANALYZE` no RELATORIO.md.
- Migration nunca destrutiva sem migração de dados no mesmo commit.

## Coleta
- O coletor é o único componente que faz requisição externa.
- Nenhuma fonte sem `base_legal` declarada na config.
- Proibido: captcha-solving, proxy rotativo para escapar de bloqueio,
  falsificação de fingerprint de navegador ou TLS, login em conta de terceiro.
  Fonte que só funciona assim sai do projeto ou muda de nível de acesso.
- `olx` e `webmotors` nascem desligadas. Não ligue por conta própria.

## Dados pessoais
- Telefone nunca em log, nunca em export padrão, mascarado por padrão na UI.
- Revelar contato gera registro de auditoria.
- "Não perturbe" e vendedor mutado são checados em todo canal de saída.

## Proibido
- Dependência pesada sem justificar em RELATORIO.md.
- Inventar endpoint, campo de banco ou fonte que não está no SPEC.
- Deletar registro para "não aparecer" — isso é filtro, nunca delete.
- Mexer em `services/collector` sem pedido explícito.
- Commit gigante. Um commit por unidade lógica, mensagem no imperativo.

## Ao terminar qualquer tarefa
Atualize RELATORIO.md: feito / decidido por mim e por quê / pendente de decisão
sua. Máximo 40 linhas, sem enfeite.

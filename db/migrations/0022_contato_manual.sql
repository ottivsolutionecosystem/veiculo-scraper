-- Contato anotado à mão na tratativa. O consignador falou com o vendedor e
-- descobriu o nome e o telefone de verdade, que muitas vezes não é o que
-- estava no anúncio. Esse dado não veio de coleta, então não tem fonte:
-- `fonte_primeira_coleta` passa a aceitar NULL em vez de a gente inventar uma
-- linha falsa em `fontes` (que apareceria na tela de Fontes com botão de rodar
-- coleta). NULL aqui lê como "não veio de coleta nenhuma".
--
-- Não é destrutiva: soltar NOT NULL não mexe em linha existente, e toda linha
-- que já está lá continua com a fonte que tinha.

ALTER TABLE contatos_vendedor
    ALTER COLUMN fonte_primeira_coleta DROP NOT NULL;

-- Editar o contato é acesso a dado pessoal e vai para a auditoria, igual
-- revelar. O detalhe gravado nunca inclui o telefone.
ALTER TABLE auditoria DROP CONSTRAINT IF EXISTS auditoria_acao_check;
ALTER TABLE auditoria
    ADD CONSTRAINT auditoria_acao_check CHECK (acao IN (
        'reveal_contact', 'discard', 'change_weight', 'mute_seller', 'delete_contact',
        'claim', 'transfer', 'create_operator', 'authorize_operator', 'parecer',
        'edit_seller_contact'
    ));

-- Seção 15.11 só exige rastrear três ações (revelar contato, descartar,
-- mudar peso) — é o que popula esta tabela. Demais mudanças de
-- configuracoes não geram linha aqui: já têm histórico via versao (0008).

CREATE TABLE IF NOT EXISTS auditoria (
    id           bigserial PRIMARY KEY,
    acao         text NOT NULL CHECK (acao IN
                 ('reveal_contact','discard','change_weight','mute_seller','delete_contact')),
    autor        text NOT NULL,
    alvo_tipo    text NOT NULL,
    alvo_id      text NOT NULL,
    detalhe      text NOT NULL,
    criado_em    timestamptz NOT NULL DEFAULT now()
);

-- Tela lista em ordem cronológica reversa por padrão.
CREATE INDEX IF NOT EXISTS ix_auditoria_criado_em ON auditoria (criado_em DESC);
-- Ficha de veículo/vendedor mostra o histórico de auditoria daquele alvo.
CREATE INDEX IF NOT EXISTS ix_auditoria_alvo ON auditoria (alvo_tipo, alvo_id);

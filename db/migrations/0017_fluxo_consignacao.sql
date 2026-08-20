-- Tratativa no kanban: visita só em Agendado; parecer devolve à fila ou vai ao estoque.

ALTER TABLE solicitacoes_captacao
    ALTER COLUMN data_hora_proposta DROP NOT NULL;

ALTER TABLE solicitacoes_captacao
    ALTER COLUMN vendedor_id DROP NOT NULL;

DROP INDEX IF EXISTS ix_solicitacoes_veiculo_abertas;
CREATE UNIQUE INDEX IF NOT EXISTS ix_solicitacoes_veiculo_abertas
    ON solicitacoes_captacao (veiculo_id)
    WHERE estado NOT IN ('closed', 'declined', 'no_show');

INSERT INTO unidades (nome, endereco, limite_veiculos_por_periodo)
SELECT 'Loja principal', 'A definir', 20
WHERE NOT EXISTS (SELECT 1 FROM unidades);

ALTER TABLE auditoria DROP CONSTRAINT IF EXISTS auditoria_acao_check;
ALTER TABLE auditoria
    ADD CONSTRAINT auditoria_acao_check CHECK (acao IN (
        'reveal_contact', 'discard', 'change_weight', 'mute_seller', 'delete_contact',
        'claim', 'transfer', 'create_operator', 'authorize_operator', 'parecer'
    ));

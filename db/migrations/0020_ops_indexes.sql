-- Índices do dashboard de operação (agregados por ação/estado e data).
CREATE INDEX IF NOT EXISTS ix_auditoria_acao_criado
    ON auditoria (acao, criado_em DESC);

CREATE INDEX IF NOT EXISTS ix_solicitacoes_estado_atualizado
    ON solicitacoes_captacao (estado, atualizado_em DESC);

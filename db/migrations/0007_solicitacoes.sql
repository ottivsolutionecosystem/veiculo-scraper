-- Solicitação de veículo na loja (SPEC seção 11). Checklist em jsonb
-- porque a seção 11 pede checklist editável — colunas booleanas fixas
-- travariam a configuração; jsonb deixa item novo no formulário de
-- Ajustes sem migration.

CREATE TABLE IF NOT EXISTS unidades (
    id                          bigserial PRIMARY KEY,
    nome                        text NOT NULL,
    endereco                    text NOT NULL,
    limite_veiculos_por_periodo integer NOT NULL DEFAULT 4
);
-- Sem índice extra: poucas lojas.

CREATE TABLE IF NOT EXISTS solicitacoes_captacao (
    id                    bigserial PRIMARY KEY,
    veiculo_id            bigint NOT NULL REFERENCES veiculos(id),
    vendedor_id           bigint NOT NULL REFERENCES vendedores(id),
    cliente_id            bigint REFERENCES clientes(id),
    unidade_id            bigint NOT NULL REFERENCES unidades(id),
    responsavel           text NOT NULL,
    data_hora_proposta    timestamptz NOT NULL,
    estado                text NOT NULL DEFAULT 'requested'
                          CHECK (estado IN ('requested','accepted','scheduled','vehicle_at_branch',
                                            'under_evaluation','offer_made','closed','declined','no_show')),
    motivo_perda          text,
    observacoes           text,
    checklist             jsonb NOT NULL DEFAULT
        '{"documento":false,"chaveReserva":false,"manual":false,"vistoria":false,"fotosPadronizadas":false,"avaliacao":false}'::jsonb,
    criado_em             timestamptz NOT NULL DEFAULT now(),
    atualizado_em         timestamptz NOT NULL DEFAULT now()
);

-- Tela é um kanban por estado; sem índice, cada coluna é um seq scan.
CREATE INDEX IF NOT EXISTS ix_solicitacoes_estado ON solicitacoes_captacao (estado);
-- Agenda por unidade com limite por período (seção 11): checar "quantos
-- veículos já agendados nesse intervalo" vira range scan neste índice.
CREATE INDEX IF NOT EXISTS ix_solicitacoes_unidade_data
    ON solicitacoes_captacao (unidade_id, data_hora_proposta);
-- Evita solicitação duplicada em aberto pro mesmo veículo.
CREATE INDEX IF NOT EXISTS ix_solicitacoes_veiculo_abertas
    ON solicitacoes_captacao (veiculo_id) WHERE estado NOT IN ('closed', 'declined');

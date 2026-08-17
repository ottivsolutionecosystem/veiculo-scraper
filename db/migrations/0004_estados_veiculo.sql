-- Histórico append-only de transição de estado. veiculos.estado é o
-- ponteiro pro estado mais recente daqui — permite reverter um descarte
-- (insere linha nova) sem perder o motivo original, e dá a timeline da
-- ficha de graça.

CREATE TABLE IF NOT EXISTS estados_veiculo (
    id          bigserial PRIMARY KEY,
    veiculo_id  bigint NOT NULL REFERENCES veiculos(id),
    estado      text NOT NULL,
    motivo      text,
    autor       text NOT NULL,
    criado_em   timestamptz NOT NULL DEFAULT now()
);

-- Timeline da ficha e "estado anterior" pro botão reverter.
CREATE INDEX IF NOT EXISTS ix_estados_veiculo_veiculo
    ON estados_veiculo (veiculo_id, criado_em DESC);

-- Uma linha por veículo — a mais recente sobrescreve (seção 9 não pede
-- histórico, só o breakdown atual). Extensível pra scores_historico depois
-- sem migração destrutiva, se precisar de tendência.

CREATE TABLE IF NOT EXISTS scores (
    veiculo_id    bigint PRIMARY KEY REFERENCES veiculos(id),
    total         smallint NOT NULL CHECK (total BETWEEN 0 AND 100),
    faixa         text NOT NULL CHECK (faixa IN ('quente','boa','morna','fria')),
    componentes   jsonb NOT NULL,  -- [{chave, rotulo_valor, pontos}, ...]
    calculado_em  timestamptz NOT NULL DEFAULT now()
);

-- Hierarquia FIPE (marca -> modelo -> ano/combustível -> preço por mês) e
-- os aliases confirmados manualmente na fila de revisão (docs/MODELO.md,
-- SPEC seção 8).

CREATE TABLE IF NOT EXISTS fipe_marcas (
    codigo  text PRIMARY KEY,
    nome    text NOT NULL
);

CREATE TABLE IF NOT EXISTS fipe_modelos (
    codigo        text PRIMARY KEY,
    marca_codigo  text NOT NULL REFERENCES fipe_marcas(codigo),
    nome          text NOT NULL
);
-- Import mensal lista modelos de uma marca por vez.
CREATE INDEX IF NOT EXISTS ix_fipe_modelos_marca ON fipe_modelos (marca_codigo);

-- ano_modelo = 32000 é a convenção da própria FIPE para "zero km".
CREATE TABLE IF NOT EXISTS fipe_anos (
    codigo         text PRIMARY KEY,
    modelo_codigo  text NOT NULL REFERENCES fipe_modelos(codigo),
    ano_modelo     smallint NOT NULL,
    combustivel    text NOT NULL CHECK (combustivel IN
                    ('FLEX','GASOLINA','ALCOOL','DIESEL','GNV','HIBRIDO','ELETRICO'))
);
CREATE INDEX IF NOT EXISTS ix_fipe_anos_modelo ON fipe_anos (modelo_codigo);

CREATE TABLE IF NOT EXISTS fipe_precos (
    id               bigserial PRIMARY KEY,
    fipe_ano_codigo  text NOT NULL REFERENCES fipe_anos(codigo),
    mes_referencia   text NOT NULL,  -- "2026-07"
    valor            bigint NOT NULL  -- centavos

    -- chave natural do import: o job faz upsert nela, nunca duplica um mês.
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_fipe_precos_ano_mes
    ON fipe_precos (fipe_ano_codigo, mes_referencia);
-- job de import lê/substitui um mês inteiro de cada vez.
CREATE INDEX IF NOT EXISTS ix_fipe_precos_mes ON fipe_precos (mes_referencia);

ALTER TABLE veiculos
    ADD CONSTRAINT fk_veiculos_fipe_ano FOREIGN KEY (fipe_ano_codigo) REFERENCES fipe_anos(codigo);

-- Alimentada pela confirmação manual da tela de Revisão de match FIPE.
-- PK dupla como índice: é a chave de lookup do lib/fipe-match.ts antes de
-- rodar trigram — "essa string eu já vi, é isso aqui" em O(1).
CREATE TABLE IF NOT EXISTS fipe_aliases (
    padrao_texto     text PRIMARY KEY,
    fipe_ano_codigo  text NOT NULL REFERENCES fipe_anos(codigo),
    confirmado_por   text NOT NULL,
    confirmado_em    timestamptz NOT NULL DEFAULT now()
);

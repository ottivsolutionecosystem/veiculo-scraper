-- Veículo canônico pós-dedupe (docs/MODELO.md). Campos descritivos
-- (marca/km/preço) não moram aqui — vêm do anúncio principal ou da
-- materialized view fila_do_dia (0011).

CREATE TABLE IF NOT EXISTS veiculos (
    id                    bigserial PRIMARY KEY,
    fingerprint           text NOT NULL,
    anuncio_principal_id  bigint REFERENCES anuncios(id),
    vendedor_id           bigint,  -- FK adicionada em 0005 (vendedores ainda não existe aqui)
    estado                text NOT NULL DEFAULT 'new'
                          CHECK (estado IN ('new','analyzing','interested','contacted',
                                            'negotiating','requested','acquired','lost','discarded')),
    motivo_descarte       text,
    gatilho_retorno_tipo  text CHECK (gatilho_retorno_tipo IN ('price_drop','days_elapsed')),
    gatilho_retorno_valor numeric,

    -- Resultado do match FIPE (seção 8), 1:1 com o veículo — atributo
    -- estável, ao contrário do score (recalcula com frequência, por isso
    -- fica em tabela própria em 0003). FK pra fipe_anos entra em 0002,
    -- depois que a tabela existir.
    fipe_ano_codigo       text,
    fipe_confianca        numeric CHECK (fipe_confianca BETWEEN 0 AND 1),
    fipe_candidatos       jsonb,  -- só populado quando 0.60 <= confiança < 0.85
    desconto_fipe_pct     numeric,
    desconto_fipe_reais   bigint,
    fipe_ajustada         bigint,

    criado_em             timestamptz NOT NULL DEFAULT now(),
    atualizado_em         timestamptz NOT NULL DEFAULT now(),

    UNIQUE (fingerprint)
);

-- Ficha do vendedor: "outros carros dele" filtra por vendedor_id direto.
CREATE INDEX IF NOT EXISTS ix_veiculos_vendedor ON veiculos (vendedor_id);

-- Maioria das leituras (fila, discador, revisão) quer só veículo em
-- trabalho — parcial evita varrer descartado/perdido à toa.
CREATE INDEX IF NOT EXISTS ix_veiculos_em_trabalho
    ON veiculos (estado) WHERE estado NOT IN ('discarded', 'lost');

-- Fila de revisão de match FIPE (seção 8): confiança nula ou ambígua.
-- Parcial porque a maioria dos veículos tem confiança alta e nunca cai
-- nesse filtro.
CREATE INDEX IF NOT EXISTS ix_veiculos_fipe_revisao
    ON veiculos (id)
    WHERE fipe_confianca IS NULL OR fipe_confianca < 0.85;

CREATE TABLE IF NOT EXISTS anuncio_veiculo (
    anuncio_id  bigint NOT NULL REFERENCES anuncios(id),
    veiculo_id  bigint NOT NULL REFERENCES veiculos(id),
    criado_em   timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (anuncio_id, veiculo_id)
);

-- Invariante do produto: um anúncio pertence a no máximo um veículo agora
-- (reatribuição futura é DELETE+INSERT, não vínculo simultâneo).
CREATE UNIQUE INDEX IF NOT EXISTS ux_anuncio_veiculo_anuncio ON anuncio_veiculo (anuncio_id);

-- Ficha do veículo lista "anúncios ligados".
CREATE INDEX IF NOT EXISTS ix_anuncio_veiculo_veiculo ON anuncio_veiculo (veiculo_id);

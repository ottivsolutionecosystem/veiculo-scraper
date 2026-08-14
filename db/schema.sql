-- Schema mínimo da coleta. O restante (score, FIPE, solicitações) vem nas
-- fases seguintes do SPEC.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS fontes (
    fonte           text PRIMARY KEY,
    nivel_acesso    text NOT NULL
                    CHECK (nivel_acesso IN ('feed_oficial','autorizado','publico_educado','manual')),
    base_legal      text NOT NULL CHECK (btrim(base_legal) <> ''),
    ativa           boolean NOT NULL DEFAULT false,
    cursor          text,
    pausado_ate     timestamptz,
    desativado      boolean NOT NULL DEFAULT false,
    motivo          text
);

CREATE TABLE IF NOT EXISTS anuncios (
    id                 bigserial PRIMARY KEY,
    fonte              text NOT NULL REFERENCES fontes(fonte),
    id_externo         text NOT NULL,
    url                text NOT NULL,

    titulo_original    text NOT NULL,
    titulo_normalizado text NOT NULL,
    marca              text,
    modelo             text,
    versao             text,
    ano_fabricacao     smallint,
    ano_modelo         smallint,
    km                 integer,
    preco              bigint,            -- centavos
    cambio             text,
    combustivel        text,
    cor                text,
    cidade             text,
    uf                 char(2),
    fotos              text[] NOT NULL DEFAULT '{}',

    fingerprint        text NOT NULL,
    content_hash       text NOT NULL,
    etag               text,
    last_modified      text,
    pendencias         text[] NOT NULL DEFAULT '{}',
    raw_json           jsonb NOT NULL DEFAULT '{}'::jsonb,

    primeira_vista_em  timestamptz NOT NULL DEFAULT now(),
    ultima_vista_em    timestamptz NOT NULL DEFAULT now(),
    ativo              boolean NOT NULL DEFAULT true,

    UNIQUE (fonte, id_externo)
);

-- Fila e busca só olham anúncio ativo: índice parcial economiza muito.
CREATE INDEX IF NOT EXISTS ix_anuncios_ativos
    ON anuncios (ativo, ultima_vista_em DESC) WHERE ativo;
CREATE INDEX IF NOT EXISTS ix_anuncios_fingerprint ON anuncios (fingerprint);
CREATE INDEX IF NOT EXISTS ix_anuncios_url         ON anuncios (fonte, url);
CREATE INDEX IF NOT EXISTS ix_anuncios_modelo_ano  ON anuncios (marca, modelo, ano_modelo)
    WHERE ativo;
CREATE INDEX IF NOT EXISTS ix_anuncios_preco       ON anuncios (preco) WHERE ativo;
CREATE INDEX IF NOT EXISTS ix_anuncios_titulo_trgm
    ON anuncios USING gin (titulo_normalizado gin_trgm_ops);
-- Fila de revisão: quem ficou com campo faltando.
CREATE INDEX IF NOT EXISTS ix_anuncios_pendencias
    ON anuncios USING gin (pendencias) WHERE ativo;

-- Histórico de preço grava só quando o preço muda. Não é log de coleta.
CREATE TABLE IF NOT EXISTS preco_historico (
    id           bigserial PRIMARY KEY,
    anuncio_id   bigint NOT NULL REFERENCES anuncios(id) ON DELETE CASCADE,
    preco        bigint NOT NULL,
    observado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_preco_hist ON preco_historico (anuncio_id, observado_em DESC);

CREATE TABLE IF NOT EXISTS scrape_runs (
    id               bigserial PRIMARY KEY,
    fonte            text NOT NULL,
    iniciado_em      timestamptz NOT NULL,
    finalizado_em    timestamptz NOT NULL DEFAULT now(),
    requisicoes      integer NOT NULL DEFAULT 0,
    nao_modificados  integer NOT NULL DEFAULT 0,
    novos            integer NOT NULL DEFAULT 0,
    atualizados      integer NOT NULL DEFAULT 0,
    inalterados      integer NOT NULL DEFAULT 0,
    revisao          integer NOT NULL DEFAULT 0,
    erros            integer NOT NULL DEFAULT 0,
    encerrado_por    text
);
CREATE INDEX IF NOT EXISTS ix_runs_fonte ON scrape_runs (fonte, iniciado_em DESC);

INSERT INTO fontes (fonte, nivel_acesso, base_legal, ativa) VALUES
    ('shopcar',   'publico_educado', 'robots.txt permite; autorizacao solicitada', true),
    ('webmotors', 'autorizado',      'PENDENTE - homologacao Sensedia',            false),
    ('olx',       'manual',          'entrada manual pelo usuario',                false)
ON CONFLICT (fonte) DO NOTHING;

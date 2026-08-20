-- Identidade do consignador: login no banco, não nome no navegador.
-- Carro em contato fica com o dono até transferir, descartar ou fechar.

CREATE TABLE IF NOT EXISTS operadores (
    id          bigserial PRIMARY KEY,
    nome        text NOT NULL,
    login       text NOT NULL,
    senha_hash  text NOT NULL,
    ativo       boolean NOT NULL DEFAULT true,
    criado_em   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT operadores_login_unico UNIQUE (login)
);

ALTER TABLE veiculos
    ADD COLUMN IF NOT EXISTS consignador_id bigint REFERENCES operadores(id);

CREATE INDEX IF NOT EXISTS ix_veiculos_consignador_id
    ON veiculos (consignador_id)
    WHERE estado NOT IN ('discarded', 'lost', 'acquired');

ALTER TABLE auditoria DROP CONSTRAINT IF EXISTS auditoria_acao_check;
ALTER TABLE auditoria
    ADD CONSTRAINT auditoria_acao_check CHECK (acao IN (
        'reveal_contact', 'discard', 'change_weight', 'mute_seller', 'delete_contact',
        'claim', 'transfer', 'create_operator'
    ));

DROP MATERIALIZED VIEW IF EXISTS fila_do_dia;

CREATE MATERIALIZED VIEW fila_do_dia AS
WITH ultimo_preco AS (
    SELECT anuncio_id,
           (array_agg(preco ORDER BY observado_em DESC))[2]        AS preco_anterior,
           (array_agg(observado_em ORDER BY observado_em DESC))[1] AS preco_mudou_em,
           count(*)::integer                                       AS precos_observados
      FROM preco_historico
     GROUP BY anuncio_id
)
SELECT
    v.id                    AS veiculo_id,
    v.fingerprint,
    v.estado,
    v.motivo_descarte,
    v.vendedor_id,
    v.desconto_fipe_pct,
    v.desconto_fipe_reais,
    v.fipe_ajustada,
    v.fipe_confianca,
    v.fipe_candidatos,
    v.consignador,
    v.consignador_id,
    v.travado_ate,
    v.ultimo_contato_em,
    v.follow_up_em,

    a.id                    AS anuncio_id,
    a.fonte,
    a.titulo_normalizado,
    a.marca,
    a.modelo,
    a.versao,
    a.ano_fabricacao,
    a.ano_modelo,
    a.km,
    a.preco,
    a.cambio,
    a.combustivel,
    a.cor,
    a.cidade,
    a.uf,
    a.fotos,
    a.ativo,
    a.desativado_em,
    a.pendencias,
    a.tipo_anunciante,
    EXTRACT(DAY FROM now() - a.primeira_vista_em)::integer AS dias_no_ar,

    p.preco_anterior,
    p.preco_mudou_em,
    CASE WHEN p.preco_anterior IS NULL OR a.preco IS NULL THEN NULL
         ELSE a.preco - p.preco_anterior END               AS preco_variacao,
    COALESCE(GREATEST(p.precos_observados - 1, 0), 0)      AS quedas_de_preco,

    s.total                 AS score_total,
    s.faixa                 AS score_faixa,
    s.componentes           AS score_componentes,
    s.calculado_em          AS score_calculado_em,

    (SELECT count(*) FROM anuncio_veiculo av WHERE av.veiculo_id = v.id) AS total_fontes,
    (SELECT count(*) FROM matches_interesse mi
      WHERE mi.veiculo_id = v.id AND mi.estado != 'discarded')          AS clientes_compativeis
FROM veiculos v
JOIN anuncios a ON a.id = v.anuncio_principal_id
LEFT JOIN ultimo_preco p ON p.anuncio_id = a.id
LEFT JOIN scores s ON s.veiculo_id = v.id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_fila_do_dia_veiculo ON fila_do_dia (veiculo_id);
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_estado_score
    ON fila_do_dia (estado, score_total DESC, veiculo_id);
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_titulo_trgm
    ON fila_do_dia USING gin (titulo_normalizado gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_desconto ON fila_do_dia (desconto_fipe_pct);
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_ano ON fila_do_dia (ano_modelo);
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_preco ON fila_do_dia (preco);
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_km ON fila_do_dia (km);
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_tipo_anunciante ON fila_do_dia (tipo_anunciante);
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_ativo ON fila_do_dia (ativo, score_total DESC);
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_trabalho
    ON fila_do_dia (consignador_id, consignador, ultimo_contato_em, follow_up_em);

-- Materialized view exigida pela seção 14 do SPEC ("materialized view
-- fila_do_dia com refresh a cada <<10 min>>"). Junta veiculos + anúncio
-- principal + score, denormalizado, pra Fila do dia e Busca (docs/API.md
-- GET /api/queue e GET /api/vehicles/search) filtrarem/ordenarem sem join
-- em tempo de request.
--
-- <<10 min>> é o intervalo sugerido no SPEC (seção 18, parâmetro a
-- definir) — refresh fica a cargo do worker (REFRESH MATERIALIZED VIEW
-- CONCURRENTLY, exige o índice unique abaixo).

CREATE MATERIALIZED VIEW IF NOT EXISTS fila_do_dia AS
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
    a.pendencias,
    EXTRACT(DAY FROM now() - a.primeira_vista_em)::integer AS dias_no_ar,

    s.total                 AS score_total,
    s.faixa                 AS score_faixa,
    s.componentes           AS score_componentes,
    s.calculado_em          AS score_calculado_em,

    (SELECT count(*) FROM anuncio_veiculo av WHERE av.veiculo_id = v.id) AS total_fontes,
    (SELECT count(*) FROM matches_interesse mi
      WHERE mi.veiculo_id = v.id AND mi.estado != 'discarded')          AS clientes_compativeis
FROM veiculos v
JOIN anuncios a ON a.id = v.anuncio_principal_id
LEFT JOIN scores s ON s.veiculo_id = v.id;

-- REFRESH ... CONCURRENTLY exige um índice unique.
CREATE UNIQUE INDEX IF NOT EXISTS ux_fila_do_dia_veiculo ON fila_do_dia (veiculo_id);

-- Índice da Fila do dia em si: ordenação por oportunidade dentro de cada
-- estado de trabalho. Composto, literal da seção 14.
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_estado_score
    ON fila_do_dia (estado, score_total DESC, veiculo_id);

-- Busca por texto livre (tela Busca).
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_titulo_trgm
    ON fila_do_dia USING gin (titulo_normalizado gin_trgm_ops);

-- Filtros/ordenação distintos na Busca — literais da seção 14.
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_desconto ON fila_do_dia (desconto_fipe_pct);
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_ano ON fila_do_dia (ano_modelo);
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_preco ON fila_do_dia (preco);
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_km ON fila_do_dia (km);

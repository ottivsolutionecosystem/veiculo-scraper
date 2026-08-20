-- Trabalho de consignação: cada veículo tem dono, trava e follow-up.
-- A fila deixa de ser um classificado e passa a ser a lista do consignador.

ALTER TABLE veiculos
    ADD COLUMN IF NOT EXISTS consignador        text,
    ADD COLUMN IF NOT EXISTS travado_ate        timestamptz,
    ADD COLUMN IF NOT EXISTS ultimo_contato_em  timestamptz,
    ADD COLUMN IF NOT EXISTS follow_up_em       timestamptz;

CREATE INDEX IF NOT EXISTS ix_veiculos_consignador_trabalho
    ON veiculos (consignador, travado_ate)
    WHERE estado NOT IN ('discarded', 'lost', 'acquired');

CREATE INDEX IF NOT EXISTS ix_veiculos_follow_up
    ON veiculos (follow_up_em)
    WHERE follow_up_em IS NOT NULL AND estado NOT IN ('discarded', 'lost', 'acquired');

-- Ligação pode acontecer antes de existir vendedor (Shopcar particular
-- sem telefone coletado). O resultado ainda precisa ser gravado.
ALTER TABLE interacoes ALTER COLUMN vendedor_id DROP NOT NULL;

ALTER TABLE interacoes DROP CONSTRAINT IF EXISTS interacoes_resultado_check;
ALTER TABLE interacoes
    ADD CONSTRAINT interacoes_resultado_check CHECK (resultado IN (
        'no_answer', 'not_interested', 'thinking', 'negotiating',
        'agreed_to_bring', 'accepted_consign', 'wants_cash',
        'unrealistic_price', 'wrong_number'
    ));

-- Pesos da consignação: FIPE + queda + dias no ar. Demanda de comprador
-- sai (peso 0). Nova versão, sem mutar a vigente in-place.
INSERT INTO configuracoes (
    versao, pesos, faixas, motivos_descarte, gatilho_retorno_pct, gatilho_retorno_dias,
    cooldown_vendedor_horas, follow_up_dias, curva_km, template_whatsapp,
    horario_permitido_inicio, horario_permitido_fim, autor
)
SELECT
    versao + 1,
    '[
      {"key":"fipe_discount","label":"Desconto vs FIPE","weight":0.42},
      {"key":"days_listed","label":"Dias no ar","weight":0.18},
      {"key":"price_drops","label":"Quedas de preço","weight":0.22},
      {"key":"model_liquidity","label":"Liquidez do modelo","weight":0.04},
      {"key":"km_vs_average","label":"Km vs média do ano","weight":0.08},
      {"key":"completeness","label":"Completude","weight":0.06},
      {"key":"internal_demand","label":"Demanda interna","weight":0}
    ]'::jsonb,
    faixas,
    motivos_descarte,
    gatilho_retorno_pct,
    gatilho_retorno_dias,
    cooldown_vendedor_horas,
    follow_up_dias,
    curva_km,
    'Olá! Vi o anúncio do seu {{modelo}} {{ano}} por {{preco}} ({{desconto_fipe}} vs FIPE). Trabalhamos com consignação: o carro fica na loja e você recebe na venda. Posso te explicar em dois minutos?',
    horario_permitido_inicio,
    horario_permitido_fim,
    'migracao-consignacao'
  FROM configuracoes
 ORDER BY versao DESC
 LIMIT 1;

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
    ON fila_do_dia (consignador, ultimo_contato_em, follow_up_em);

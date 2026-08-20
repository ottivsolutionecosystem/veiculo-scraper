-- Coleta incremental assertiva: progresso visível do pedido, marcação de
-- anúncio que saiu do ar (nunca DELETE — CLAUDE.md) e variação de preço
-- pré-calculada na fila (nada de subquery em tempo de request).

-- Progresso do pedido do botão "Rodar coleta agora". O coletor grava aqui
-- enquanto roda; a tela Fontes só lê. Continua sem RPC: a fronteira é o
-- Postgres.
ALTER TABLE execucoes_solicitadas
    ADD COLUMN IF NOT EXISTS iniciado_em timestamptz,
    ADD COLUMN IF NOT EXISTS progresso   jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Quando o anúncio saiu do ar. `ativo = false` já existia; sem a data não
-- dá para dizer "saiu ontem" na tela nem auditar a varredura.
ALTER TABLE anuncios
    ADD COLUMN IF NOT EXISTS desativado_em timestamptz;

-- Varredura pós-coleta pergunta exatamente isto: "quais anúncios ativos
-- desta fonte/tipo não foram vistos nesta execução?"
CREATE INDEX IF NOT EXISTS ix_anuncios_sweep
    ON anuncios (fonte, tipo_anunciante, ultima_vista_em)
    WHERE ativo;

-- Resumo da execução ganha o que o usuário pediu ver: quantos saíram do ar
-- e quantos mudaram de preço, além de qual filtro rodou.
ALTER TABLE scrape_runs
    ADD COLUMN IF NOT EXISTS tipo_anunciante_filtro text
        CHECK (tipo_anunciante_filtro IN ('particular', 'loja')),
    ADD COLUMN IF NOT EXISTS desativados      integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS precos_alterados integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ignorados_filtro integer NOT NULL DEFAULT 0;

-- fila_do_dia recriada (materialized view não aceita ALTER) para carregar
-- preço anterior e data da mudança. Dado derivado: o refresh repopula.
DROP MATERIALIZED VIEW IF EXISTS fila_do_dia;

CREATE MATERIALIZED VIEW fila_do_dia AS
WITH ultimo_preco AS (
    -- Penúltimo preço observado de cada anúncio: é o "de quanto caiu".
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
    -- Só conta como queda/alta se existe preço anterior de verdade.
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
-- Fila só mostra anúncio no ar; o filtro entra em quase toda query.
CREATE INDEX IF NOT EXISTS ix_fila_do_dia_ativo ON fila_do_dia (ativo, score_total DESC);

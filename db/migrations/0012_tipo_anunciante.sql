-- Distinção particular vs loja no anúncio (pedido do usuário: filtro na
-- Busca e no botão de coleta sob demanda). O coletor detecta isso via
-- JSON-LD (offers.seller.@type Organization/Person) com fallback de
-- seletor CSS — ver services/collector/captacao_bot/adapters/shopcar.py.
-- NULL continua significando "não detectado", nunca um terceiro valor.
ALTER TABLE anuncios
    ADD COLUMN IF NOT EXISTS tipo_anunciante text
        CHECK (tipo_anunciante IN ('particular', 'loja'));

-- Fila de pedidos de coleta sob demanda (botão "Rodar coleta agora" na
-- tela Fontes). Não é RPC: o botão só grava a linha aqui (SPEC seção 5 —
-- a fronteira TS/Python é o Postgres); o coletor Python lê essa tabela
-- quando roda (`cli.py pedidos --fonte <fonte>`) e marca processado_em +
-- scrape_run_id ao terminar.
CREATE TABLE IF NOT EXISTS execucoes_solicitadas (
    id                     bigserial PRIMARY KEY,
    fonte                  text NOT NULL REFERENCES fontes(fonte),
    tipo_anunciante_filtro text CHECK (tipo_anunciante_filtro IN ('particular', 'loja')),
    limite                 integer,
    solicitado_por         text NOT NULL,
    solicitado_em          timestamptz NOT NULL DEFAULT now(),
    processado_em          timestamptz,
    scrape_run_id          bigint REFERENCES scrape_runs(id)
);

-- "Já tem pedido pendente pra essa fonte?" — a rota de trigger consulta
-- isso pra não empilhar pedido em cima de pedido.
CREATE INDEX IF NOT EXISTS ix_execucoes_solicitadas_pendente
    ON execucoes_solicitadas (fonte, solicitado_em DESC)
    WHERE processado_em IS NULL;

-- fila_do_dia (0011) precisa do campo novo pro filtro de Busca —
-- materialized view não aceita ALTER, só recriar. Não é destrutivo: é
-- dado derivado, refresh (worker ou o refresh do db.ts) repopula na hora.
DROP MATERIALIZED VIEW IF EXISTS fila_do_dia;

CREATE MATERIALIZED VIEW fila_do_dia AS
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
    a.tipo_anunciante,
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

-- Fila de ingestão assistida de HTML de listagem (Shopcar).
-- O painel só grava a linha; o coletor Python processa sem GET na fonte
-- (fronteira TS/Python = Postgres, SPEC seção 5). Não desativa anúncios
-- ausentes: cada página é um recorte, não a enumeração completa.

CREATE TABLE IF NOT EXISTS ingestao_listagens (
    id              bigserial PRIMARY KEY,
    fonte           text NOT NULL REFERENCES fontes(fonte),
    pagina          integer,
    html            text NOT NULL,
    base_url        text NOT NULL,
    solicitado_por  text NOT NULL,
    solicitado_em   timestamptz NOT NULL DEFAULT now(),
    iniciado_em     timestamptz,
    processado_em   timestamptz,
    erro            text,
    resultado       jsonb NOT NULL DEFAULT '{}'::jsonb,
    scrape_run_id   bigint REFERENCES scrape_runs(id)
);

CREATE INDEX IF NOT EXISTS ix_ingestao_listagens_pendente
    ON ingestao_listagens (fonte, solicitado_em ASC)
    WHERE processado_em IS NULL;

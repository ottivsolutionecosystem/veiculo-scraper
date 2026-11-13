-- Fila de URLs para captura no browser do usuário (bookmarklet/console).
-- O servidor não faz GET nessas URLs — só guarda a ordem e o “próximo”.

CREATE TABLE IF NOT EXISTS ingestao_url_fila (
    id              bigserial PRIMARY KEY,
    fonte           text NOT NULL REFERENCES fontes(fonte),
    urls            jsonb NOT NULL DEFAULT '[]'::jsonb,
    cursor_idx      integer NOT NULL DEFAULT 0,
    solicitado_por  text NOT NULL,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    encerrado_em    timestamptz
);

CREATE INDEX IF NOT EXISTS ix_ingestao_url_fila_aberta
    ON ingestao_url_fila (fonte, criado_em DESC)
    WHERE encerrado_em IS NULL;

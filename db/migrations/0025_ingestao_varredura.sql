-- Varredura de ausentes na captura página a página (userscript).
-- Ao encerrar a fila de URLs e processar todo o HTML, desativa quem não
-- apareceu nas páginas capturadas — equivalente à enumeração completa.

ALTER TABLE ingestao_url_fila
    ADD COLUMN IF NOT EXISTS ids_vistos jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS tipo_anunciante text,
    ADD COLUMN IF NOT EXISTS varredura_em timestamptz,
    ADD COLUMN IF NOT EXISTS desativados integer;

CREATE INDEX IF NOT EXISTS ix_ingestao_url_fila_varredura_pendente
    ON ingestao_url_fila (fonte, criado_em DESC)
    WHERE encerrado_em IS NOT NULL AND varredura_em IS NULL;

-- Telefonia (SPEC §12): id externo da ligação, gravação e timestamps.
-- A tabela telefonia_entregas só existe para idempotência do webhook
-- inbound — não é entidade de domínio.

ALTER TABLE interacoes
    ADD COLUMN IF NOT EXISTS id_externo text,
    ADD COLUMN IF NOT EXISTS gravacao_id text,
    ADD COLUMN IF NOT EXISTS gravacao_url text,
    ADD COLUMN IF NOT EXISTS iniciada_em timestamptz,
    ADD COLUMN IF NOT EXISTS encerrada_em timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS ux_interacoes_id_externo
    ON interacoes (id_externo)
    WHERE id_externo IS NOT NULL;

CREATE TABLE IF NOT EXISTS telefonia_entregas (
    delivery_id  text PRIMARY KEY,
    recebido_em  timestamptz NOT NULL DEFAULT now()
);

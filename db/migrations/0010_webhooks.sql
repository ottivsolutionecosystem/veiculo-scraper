-- Webhooks de saída (SPEC seção 13). webhook_entregas não está nomeada na
-- seção 6, mas a seção 13 exige log de entrega visível na UI e retry com
-- backoff — sem tabela isso não existe. Decisão registrada em
-- docs/MODELO.md, não invenção silenciosa.

CREATE TABLE IF NOT EXISTS webhooks (
    id             bigserial PRIMARY KEY,
    url            text NOT NULL,
    eventos        jsonb NOT NULL,  -- [string, ...]
    ativo          boolean NOT NULL DEFAULT true,
    segredo        text NOT NULL,   -- HMAC-SHA256; nunca sai em resposta de API
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now()
);
-- Sem índice extra: poucos webhooks configurados por operação.

CREATE TABLE IF NOT EXISTS webhook_entregas (
    id           bigserial PRIMARY KEY,
    webhook_id   bigint NOT NULL REFERENCES webhooks(id),
    evento       text NOT NULL,
    payload      jsonb NOT NULL,
    tentativa    smallint NOT NULL DEFAULT 1,
    status_http  integer,
    sucesso      boolean NOT NULL DEFAULT false,
    criado_em    timestamptz NOT NULL DEFAULT now()
);

-- Log de entrega por webhook, mais recente primeiro.
CREATE INDEX IF NOT EXISTS ix_webhook_entregas_webhook
    ON webhook_entregas (webhook_id, criado_em DESC);
-- Job de retry acha entregas pendentes sem varrer as que já tiveram sucesso.
CREATE INDEX IF NOT EXISTS ix_webhook_entregas_pendentes
    ON webhook_entregas (criado_em) WHERE sucesso = false;

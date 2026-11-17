-- Oferecimentos de consórcio (vistoria remota). Link público por token
-- permite o cliente completar a avaliação no próprio celular.

CREATE TABLE IF NOT EXISTS consorcio_oferecimentos (
    id              text PRIMARY KEY,
    public_token    text NOT NULL UNIQUE,
    status          text NOT NULL,
    plate           text NOT NULL DEFAULT '',
    brand           text,
    model           text,
    model_year      integer,
    color           text,
    km              integer,
    fipe            jsonb,
    bid_cents       bigint,
    tires           jsonb NOT NULL DEFAULT '{
      "frontLeft":"unknown","frontRight":"unknown",
      "rearLeft":"unknown","rearRight":"unknown","notes":null
    }'::jsonb,
    photos          jsonb NOT NULL DEFAULT '[]'::jsonb,
    owner_name      text,
    owner_phone     text,
    notes           text,
    created_by      text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    listed_at       timestamptz,
    proposals       jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_consorcio_oferecimentos_updated
    ON consorcio_oferecimentos (updated_at DESC);

CREATE INDEX IF NOT EXISTS ix_consorcio_oferecimentos_status
    ON consorcio_oferecimentos (status);

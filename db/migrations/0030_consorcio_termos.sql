-- Aceite da declaração de veracidade no link público de avaliação
ALTER TABLE consorcio_oferecimentos
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text;

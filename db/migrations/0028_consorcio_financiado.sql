-- Financiamento do veículo no oferecimento de consórcio
ALTER TABLE consorcio_oferecimentos
  ADD COLUMN IF NOT EXISTS financed boolean,
  ADD COLUMN IF NOT EXISTS payoff_cents bigint;

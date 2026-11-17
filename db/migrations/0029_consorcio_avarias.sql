-- Declaração de avarias no oferecimento de consórcio
ALTER TABLE consorcio_oferecimentos
  ADD COLUMN IF NOT EXISTS has_damage boolean;

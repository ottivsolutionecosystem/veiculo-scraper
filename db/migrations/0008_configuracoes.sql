-- Versionado por append — "editável sem deploy" (princípio 2) não implica
-- mutação in-place. Cada save é uma linha nova; a de maior versao é a
-- vigente. Isso também é o histórico de mudança de peso pra auditoria,
-- sem duplicar dado.

CREATE TABLE IF NOT EXISTS configuracoes (
    id                          bigserial PRIMARY KEY,
    versao                      integer NOT NULL,
    pesos                       jsonb NOT NULL,       -- [{chave, rotulo, peso}, ...]
    faixas                      jsonb NOT NULL,       -- {quente, boa, morna}
    motivos_descarte            jsonb NOT NULL,       -- [string, ...]
    gatilho_retorno_pct         numeric NOT NULL,
    gatilho_retorno_dias        integer NOT NULL,
    cooldown_vendedor_horas     integer NOT NULL,
    follow_up_dias              jsonb NOT NULL,       -- [2, 7]
    curva_km                    jsonb NOT NULL,       -- [{anoModelo, kmMedio}, ...]
    template_whatsapp           text NOT NULL,
    horario_permitido_inicio    time NOT NULL,
    horario_permitido_fim       time NOT NULL,
    autor                       text NOT NULL,
    criado_em                   timestamptz NOT NULL DEFAULT now()
);

-- Buscar a config vigente é sempre "maior versão"; tabela pequena, mas o
-- índice deixa o LIMIT 1 O(log n) em vez de sort completo.
CREATE UNIQUE INDEX IF NOT EXISTS ux_configuracoes_versao ON configuracoes (versao DESC);

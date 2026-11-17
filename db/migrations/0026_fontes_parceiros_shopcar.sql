-- Lojistas parceiros com vitrine no Shopcar. Mesmo HTML/parser da fonte
-- shopcar; fonte lógica separada para filtrar estoque e runs no painel.
-- Coleta: só ingestão assistida (link + páginas no browser) — sem varredura
-- automática do marketplace.

INSERT INTO fontes (fonte, nivel_acesso, base_legal, ativa) VALUES
    (
      'teca',
      'autorizado',
      'parceria Teca Automóveis; vitrine pública no Shopcar',
      true
    ),
    (
      'barbosa',
      'autorizado',
      'parceria Barbosa Automóveis; vitrine pública no Shopcar',
      true
    ),
    (
      'p12',
      'autorizado',
      'parceria P12 Motors; vitrine pública no Shopcar',
      true
    )
ON CONFLICT (fonte) DO NOTHING;

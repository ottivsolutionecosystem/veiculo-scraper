-- Vendedor e contato (SPEC seção 4.6/12). Telefone não mora em
-- `vendedores` — isolado em contatos_vendedor para TTL/auditoria/exclusão
-- em uma ação só. Aqui só o hash, que serve tanto pra dedupe quanto pra
-- checar bloqueio_contato sem tocar no dado pessoal bruto.

CREATE TABLE IF NOT EXISTS vendedores (
    id              bigserial PRIMARY KEY,
    nome            text NOT NULL,
    telefone_hash   text NOT NULL,
    mutado          boolean NOT NULL DEFAULT false,
    nao_perturbe    boolean NOT NULL DEFAULT false,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    atualizado_em   timestamptz NOT NULL DEFAULT now()
);
-- Chave de dedupe: todo anúncio do mesmo telefone cai no mesmo vendedor.
CREATE UNIQUE INDEX IF NOT EXISTS ux_vendedores_telefone_hash ON vendedores (telefone_hash);

ALTER TABLE veiculos DROP CONSTRAINT IF EXISTS fk_veiculos_vendedor;
ALTER TABLE veiculos
    ADD CONSTRAINT fk_veiculos_vendedor FOREIGN KEY (vendedor_id) REFERENCES vendedores(id);

-- Isolada de propósito (seção 4.6): dá pra excluir o telefone numa ação só
-- sem apagar o histórico de interações do vendedor.
CREATE TABLE IF NOT EXISTS contatos_vendedor (
    id                      bigserial PRIMARY KEY,
    vendedor_id             bigint NOT NULL REFERENCES vendedores(id),
    telefone_e164           text NOT NULL,  -- único lugar do banco com telefone em claro
    fonte_primeira_coleta   text NOT NULL REFERENCES fontes(fonte),
    ttl_expira_em           timestamptz NOT NULL,
    criado_em               timestamptz NOT NULL DEFAULT now()
);
-- 1:1 na prática; tabela separada por controle de acesso, não cardinalidade.
CREATE UNIQUE INDEX IF NOT EXISTS ux_contatos_vendedor_vendedor ON contatos_vendedor (vendedor_id);
-- Job de expiração varre "vencidos até agora", não a tabela toda.
CREATE INDEX IF NOT EXISTS ix_contatos_vendedor_ttl ON contatos_vendedor (ttl_expira_em);

-- Sobrevive à exclusão de contatos_vendedor — impede recoleta da mesma
-- pessoa depois que pediu pra sair.
CREATE TABLE IF NOT EXISTS bloqueio_contato (
    telefone_hash  text PRIMARY KEY,
    motivo         text NOT NULL,
    criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interacoes (
    id                  bigserial PRIMARY KEY,
    veiculo_id          bigint NOT NULL REFERENCES veiculos(id),
    vendedor_id         bigint NOT NULL REFERENCES vendedores(id),
    canal               text NOT NULL CHECK (canal IN ('phone','whatsapp')),
    resultado           text CHECK (resultado IN
                        ('no_answer','not_interested','thinking','negotiating',
                         'agreed_to_bring','wrong_number')),
    duracao_segundos    integer,
    autor               text NOT NULL,
    criado_em           timestamptz NOT NULL DEFAULT now()
);

-- Hot path: todo card do Discador e da Fila precisa saber se o vendedor
-- está em cooldown de 24h. Sem isso é um scan por card renderizado.
CREATE INDEX IF NOT EXISTS ix_interacoes_vendedor ON interacoes (vendedor_id, criado_em DESC);
-- Timeline da ficha do veículo.
CREATE INDEX IF NOT EXISTS ix_interacoes_veiculo ON interacoes (veiculo_id, criado_em DESC);

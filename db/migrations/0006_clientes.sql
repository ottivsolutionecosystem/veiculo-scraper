-- Clientes, interesses e casamento (SPEC seção 10).

CREATE TABLE IF NOT EXISTS clientes (
    id             bigserial PRIMARY KEY,
    nome           text NOT NULL,
    contato        text NOT NULL,
    origem         text NOT NULL,
    responsavel    text NOT NULL,
    observacoes    text,
    criado_em      timestamptz NOT NULL DEFAULT now()
);
-- Sem índice além da PK: tabela de compradores internos, cresce devagar.
-- Revisitar se um dia isso mudar.

CREATE TABLE IF NOT EXISTS interesses (
    id             bigserial PRIMARY KEY,
    cliente_id     bigint NOT NULL REFERENCES clientes(id),
    marca          text,
    modelo         text,
    ano_min        smallint,
    ano_max        smallint,
    km_maximo      integer,
    preco_min      bigint,
    preco_max      bigint,
    cambio         text CHECK (cambio IN ('MANUAL','AUTOMATICO','AUTOMATIZADO')),
    cidade         text,
    prioridade     text NOT NULL CHECK (prioridade IN ('high','medium','low')),
    validade_ate   timestamptz,
    status         text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused','fulfilled')),
    criado_em      timestamptz NOT NULL DEFAULT now()
);
-- Ficha do cliente.
CREATE INDEX IF NOT EXISTS ix_interesses_cliente ON interesses (cliente_id);
-- Índice do job match:interesse: candidatos por marca/modelo entre
-- interesses ativos, sem varrer pausado/atendido.
CREATE INDEX IF NOT EXISTS ix_interesses_marca_modelo_ativos
    ON interesses (marca, modelo) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS matches_interesse (
    id                bigserial PRIMARY KEY,
    interesse_id      bigint NOT NULL REFERENCES interesses(id),
    veiculo_id        bigint NOT NULL REFERENCES veiculos(id),
    score_aderencia   smallint NOT NULL CHECK (score_aderencia BETWEEN 0 AND 100),
    estado            text NOT NULL DEFAULT 'suggested'
                      CHECK (estado IN ('suggested','accepted','discarded')),
    criado_em         timestamptz NOT NULL DEFAULT now()
);
-- O job roda a cada veículo novo/atualizado; sem unique, cada rerun
-- duplicaria o match.
CREATE UNIQUE INDEX IF NOT EXISTS ux_matches_interesse_par
    ON matches_interesse (interesse_id, veiculo_id);
-- Ficha do veículo mostra "N clientes procurando" (a unique acima já
-- cobre a busca por interesse_id).
CREATE INDEX IF NOT EXISTS ix_matches_interesse_veiculo ON matches_interesse (veiculo_id);

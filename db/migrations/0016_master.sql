-- Só um master: guilherme.sanches autoriza quem entra.

ALTER TABLE operadores
    ADD COLUMN IF NOT EXISTS papel text NOT NULL DEFAULT 'consignador';

ALTER TABLE operadores DROP CONSTRAINT IF EXISTS operadores_papel_check;
ALTER TABLE operadores
    ADD CONSTRAINT operadores_papel_check CHECK (papel IN ('master', 'consignador'));

UPDATE operadores
   SET papel = 'master'
 WHERE lower(login) = 'guilherme.sanches';

CREATE UNIQUE INDEX IF NOT EXISTS ux_operadores_um_master
    ON operadores (papel)
    WHERE papel = 'master';

ALTER TABLE auditoria DROP CONSTRAINT IF EXISTS auditoria_acao_check;
ALTER TABLE auditoria
    ADD CONSTRAINT auditoria_acao_check CHECK (acao IN (
        'reveal_contact', 'discard', 'change_weight', 'mute_seller', 'delete_contact',
        'claim', 'transfer', 'create_operator', 'authorize_operator'
    ));

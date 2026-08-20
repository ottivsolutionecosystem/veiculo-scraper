"""Persistência.

Duas implementações: `PostgresStorage` (produção) e `MemoryStorage` (testes).
O runner só conhece a interface `Storage` — teste de coleta roda offline, sem
banco e sem rede.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Protocol

from .models import VeiculoNormalizado


@dataclass
class EstadoAnuncio:
    content_hash: str | None
    etag: str | None
    last_modified: str | None
    preco: int | None = None
    ativo: bool = True
    ultima_vista_em: datetime | None = None


@dataclass
class ResultadoSalvar:
    novo: bool
    preco_anterior: int | None = None

    @property
    def preco_mudou(self) -> bool:
        return not self.novo and self.preco_anterior is not None


class Storage(Protocol):
    def estado_do_anuncio(self, fonte: str, url: str) -> EstadoAnuncio | None: ...
    def marcar_visto(self, fonte: str, url: str) -> None: ...
    def salvar(
        self,
        veiculo: VeiculoNormalizado,
        raw: dict[str, Any],
        etag: str | None,
        last_modified: str | None,
        pendencias: list[str],
    ) -> ResultadoSalvar: ...
    def desativar_ausentes(
        self, fonte: str, tipo_anunciante: str | None, ids_vistos: list[str]
    ) -> int: ...
    def registrar_execucao(self, resultado) -> int: ...


class MemoryStorage:
    """Para teste e para rodar o adapter a seco (`--dry-run`)."""

    def __init__(self) -> None:
        self.anuncios: dict[tuple[str, str], dict] = {}
        self.execucoes: list[Any] = []

    def estado_do_anuncio(self, fonte: str, url: str) -> EstadoAnuncio | None:
        reg = self.anuncios.get((fonte, url))
        if not reg:
            return None
        return EstadoAnuncio(
            reg["content_hash"],
            reg.get("etag"),
            reg.get("last_modified"),
            preco=getattr(reg.get("veiculo"), "preco", None),
            ativo=reg.get("ativo", True),
            ultima_vista_em=reg.get("ultima_vista_em"),
        )

    def marcar_visto(self, fonte: str, url: str) -> None:
        reg = self.anuncios.get((fonte, url))
        if reg:
            reg["ultima_vista_em"] = datetime.now(timezone.utc)
            reg["ativo"] = True

    def salvar(self, veiculo, raw, etag, last_modified, pendencias) -> ResultadoSalvar:
        chave = (veiculo.fonte, veiculo.url)
        anterior = self.anuncios.get(chave)
        preco_anterior = getattr(anterior.get("veiculo"), "preco", None) if anterior else None
        self.anuncios[chave] = {
            "veiculo": veiculo,
            "raw": raw,
            "etag": etag,
            "last_modified": last_modified,
            "content_hash": veiculo.content_hash,
            "pendencias": pendencias,
            "ultima_vista_em": datetime.now(timezone.utc),
            "ativo": True,
        }
        if anterior is None:
            return ResultadoSalvar(novo=True)
        mudou = preco_anterior != veiculo.preco
        return ResultadoSalvar(novo=False, preco_anterior=preco_anterior if mudou else None)

    def desativar_ausentes(self, fonte, tipo_anunciante, ids_vistos) -> int:
        vistos = set(ids_vistos)
        desativados = 0
        for reg in self.anuncios.values():
            veiculo = reg.get("veiculo")
            if veiculo is None or veiculo.fonte != fonte or not reg.get("ativo", True):
                continue
            if tipo_anunciante is not None and veiculo.tipo_anunciante == (
                "loja" if tipo_anunciante == "particular" else "particular"
            ):
                continue
            if veiculo.id_externo not in vistos:
                reg["ativo"] = False
                desativados += 1
        return desativados

    def registrar_execucao(self, resultado) -> int:
        self.execucoes.append(resultado)
        return len(self.execucoes)


class PostgresStorage:
    """Requer psycopg 3. Ver schema.sql.

    O upsert é idempotente por `(fonte, id_externo)` e grava histórico de preço
    apenas quando o preço muda — histórico não é log de coleta.
    """

    def __init__(self, conn) -> None:
        self.conn = conn

    def estado_do_anuncio(self, fonte: str, url: str) -> EstadoAnuncio | None:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT content_hash, etag, last_modified, preco, ativo, ultima_vista_em
                  FROM anuncios
                 WHERE fonte = %s AND url = %s
                """,
                (fonte, url),
            )
            row = cur.fetchone()
        return EstadoAnuncio(*row) if row else None

    def marcar_visto(self, fonte: str, url: str) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                "UPDATE anuncios SET ultima_vista_em = now(), ativo = true, "
                "       desativado_em = NULL"
                " WHERE fonte = %s AND url = %s",
                (fonte, url),
            )
        self.conn.commit()

    def desativar_ausentes(
        self, fonte: str, tipo_anunciante: str | None, ids_vistos: list[str]
    ) -> int:
        """Anúncio que não apareceu na varredura completa da listagem saiu do
        ar. Nunca DELETE: some da fila por `ativo = false` e o histórico de
        preço continua lá (CLAUDE.md).

        Com filtro de tipo, o oposto é preservado — a listagem de particular
        não diz nada sobre anúncio de loja. Tipo NULL (ambíguo) entra na
        varredura porque só pode ter vindo da listagem que rodou.
        """
        oposto = {"particular": "loja", "loja": "particular"}.get(tipo_anunciante or "")
        with self.conn.cursor() as cur:
            # `::text[]` e ramos separados evitam IndeterminateDatatype: psycopg
            # manda NULL sem tipo em `%s IS NULL` e o Postgres recusa o UPDATE —
            # a coleta inteira caía depois de gravar os anúncios, e a fila
            # nunca via veículo.
            if oposto is None:
                cur.execute(
                    """
                    UPDATE anuncios
                       SET ativo = false, desativado_em = now()
                     WHERE fonte = %s
                       AND ativo
                       AND NOT (id_externo = ANY(%s::text[]))
                    """,
                    (fonte, ids_vistos),
                )
            else:
                cur.execute(
                    """
                    UPDATE anuncios
                       SET ativo = false, desativado_em = now()
                     WHERE fonte = %s
                       AND ativo
                       AND tipo_anunciante IS DISTINCT FROM %s
                       AND NOT (id_externo = ANY(%s::text[]))
                    """,
                    (fonte, oposto, ids_vistos),
                )
            afetados = cur.rowcount
        self.conn.commit()
        return afetados

    def marcar_pedido_iniciado(self, pedido_id: int) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                "UPDATE execucoes_solicitadas SET iniciado_em = now() WHERE id = %s",
                (pedido_id,),
            )
        self.conn.commit()

    def atualizar_progresso(self, pedido_id: int, progresso: dict) -> None:
        """A tela Fontes lê isto para mostrar a coleta andando. Commit por
        atualização de propósito: progresso que só aparece no fim não serve."""
        import json

        with self.conn.cursor() as cur:
            cur.execute(
                "UPDATE execucoes_solicitadas SET progresso = %s::jsonb WHERE id = %s",
                (json.dumps(progresso, ensure_ascii=False), pedido_id),
            )
        self.conn.commit()

    def salvar(self, veiculo, raw, etag, last_modified, pendencias) -> ResultadoSalvar:
        import json

        with self.conn.cursor() as cur:
            # Preço antigo antes do upsert: o RETURNING de ON CONFLICT DO
            # UPDATE já devolve a linha nova, então "de quanto para quanto"
            # tem que ser lido aqui. Mesma transação, índice único.
            cur.execute(
                "SELECT preco FROM anuncios WHERE fonte = %s AND id_externo = %s",
                (veiculo.fonte, veiculo.id_externo),
            )
            linha_antiga = cur.fetchone()
            preco_antigo = linha_antiga[0] if linha_antiga else None

            cur.execute(
                """
                INSERT INTO anuncios (
                    fonte, id_externo, url, titulo_original, titulo_normalizado,
                    marca, modelo, versao, ano_fabricacao, ano_modelo, km, preco,
                    cambio, combustivel, cor, cidade, uf, fotos, tipo_anunciante,
                    fingerprint, content_hash, etag, last_modified,
                    pendencias, raw_json,
                    primeira_vista_em, ultima_vista_em, ativo, desativado_em
                ) VALUES (
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s, now(), now(), true, NULL
                )
                ON CONFLICT (fonte, id_externo) DO UPDATE SET
                    url = EXCLUDED.url,
                    titulo_original = EXCLUDED.titulo_original,
                    titulo_normalizado = EXCLUDED.titulo_normalizado,
                    marca = EXCLUDED.marca,
                    modelo = EXCLUDED.modelo,
                    versao = EXCLUDED.versao,
                    ano_fabricacao = EXCLUDED.ano_fabricacao,
                    ano_modelo = EXCLUDED.ano_modelo,
                    km = EXCLUDED.km,
                    preco = EXCLUDED.preco,
                    cambio = EXCLUDED.cambio,
                    combustivel = EXCLUDED.combustivel,
                    cor = EXCLUDED.cor,
                    cidade = EXCLUDED.cidade,
                    uf = EXCLUDED.uf,
                    fotos = EXCLUDED.fotos,
                    tipo_anunciante = EXCLUDED.tipo_anunciante,
                    fingerprint = EXCLUDED.fingerprint,
                    content_hash = EXCLUDED.content_hash,
                    etag = EXCLUDED.etag,
                    last_modified = EXCLUDED.last_modified,
                    pendencias = EXCLUDED.pendencias,
                    raw_json = EXCLUDED.raw_json,
                    ultima_vista_em = now(),
                    ativo = true,
                    desativado_em = NULL
                RETURNING (xmax = 0) AS inserido, id
                """,
                (
                    veiculo.fonte, veiculo.id_externo, veiculo.url,
                    veiculo.titulo_original, veiculo.titulo_normalizado,
                    veiculo.marca, veiculo.modelo, veiculo.versao, veiculo.ano_fabricacao,
                    veiculo.ano_modelo, veiculo.km, veiculo.preco,
                    veiculo.cambio, veiculo.combustivel, veiculo.cor,
                    veiculo.cidade, veiculo.uf, veiculo.fotos, veiculo.tipo_anunciante,
                    veiculo.fingerprint, veiculo.content_hash, etag,
                    last_modified, pendencias, json.dumps(raw, ensure_ascii=False),
                ),
            )
            inserido, anuncio_id = cur.fetchone()

            if veiculo.preco is not None:
                cur.execute(
                    """
                    INSERT INTO preco_historico (anuncio_id, preco, observado_em)
                    SELECT %s, %s, now()
                     WHERE NOT EXISTS (
                        SELECT 1 FROM preco_historico
                         WHERE anuncio_id = %s
                         ORDER BY observado_em DESC
                         LIMIT 1
                    ) OR (
                        SELECT preco FROM preco_historico
                         WHERE anuncio_id = %s
                         ORDER BY observado_em DESC
                         LIMIT 1
                    ) IS DISTINCT FROM %s
                    """,
                    (anuncio_id, veiculo.preco, anuncio_id, anuncio_id, veiculo.preco),
                )
        self.conn.commit()
        if inserido:
            return ResultadoSalvar(novo=True)
        mudou = preco_antigo != veiculo.preco
        return ResultadoSalvar(novo=False, preco_anterior=preco_antigo if mudou else None)

    def registrar_execucao(self, resultado) -> int:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO scrape_runs (
                    fonte, iniciado_em, finalizado_em, requisicoes,
                    nao_modificados, novos, atualizados, inalterados,
                    revisao, erros, encerrado_por,
                    tipo_anunciante_filtro, desativados, precos_alterados,
                    ignorados_filtro
                ) VALUES (%s,%s, now(), %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id
                """,
                (
                    resultado.fonte, resultado.iniciado_em, resultado.requisicoes,
                    resultado.nao_modificados, resultado.novos,
                    resultado.atualizados, resultado.inalterados,
                    resultado.revisao, resultado.erros, resultado.encerrado_por,
                    resultado.tipo_anunciante_filtro, resultado.desativados,
                    resultado.precos_alterados, resultado.ignorados_filtro,
                ),
            )
            (scrape_run_id,) = cur.fetchone()
        self.conn.commit()
        return scrape_run_id

    def pedidos_pendentes(self, fonte: str) -> list[dict]:
        """Pedidos de coleta sob demanda (botão na tela Fontes) ainda não
        processados, mais antigo primeiro — não é RPC, é o coletor lendo o
        Postgres, a mesma fronteira de sempre (SPEC seção 5)."""
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, tipo_anunciante_filtro, limite
                  FROM execucoes_solicitadas
                 WHERE fonte = %s AND processado_em IS NULL
                 ORDER BY solicitado_em ASC
                """,
                (fonte,),
            )
            colunas = [d.name for d in cur.description]
            return [dict(zip(colunas, row)) for row in cur.fetchall()]

    def marcar_pedido_processado(self, pedido_id: int, scrape_run_id: int | None) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                "UPDATE execucoes_solicitadas SET processado_em = now(), scrape_run_id = %s WHERE id = %s",
                (scrape_run_id, pedido_id),
            )
        self.conn.commit()

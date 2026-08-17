"""Orquestração da coleta.

O runner é quem gasta requisição, então é quem carrega as regras de economia:

- Sitemap antes de paginar listagem, quando disponível.
- Conditional GET com o validador salvo da última visita.
- Early stop: N anúncios conhecidos e inalterados em sequência encerram a fonte.
- Content hash: se não mudou, não normaliza, não reprocessa, só marca visto.
"""

from __future__ import annotations

import logging
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import datetime, timezone

from .adapters.base import Adapter
from .http_client import (
    BloqueadoPorRobots,
    FontePausada,
    ForaDaJanela,
    PoliteClient,
)
from .models import VeiculoNormalizado
from .pipeline import normalizar, precisa_revisao
from .storage import Storage
from .sitemap import urls_de_sitemap

log = logging.getLogger(__name__)


@dataclass
class ResultadoColeta:
    fonte: str
    requisicoes: int = 0
    nao_modificados: int = 0
    novos: int = 0
    atualizados: int = 0
    inalterados: int = 0
    revisao: int = 0
    erros: int = 0
    ignorados_filtro: int = 0
    encerrado_por: str = "fim"
    iniciado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    scrape_run_id: int | None = None  # preenchido por registrar_execucao (só PostgresStorage)

    def resumo(self) -> str:
        base = (
            f"[{self.fonte}] req={self.requisicoes} 304={self.nao_modificados} "
            f"novos={self.novos} atualizados={self.atualizados} "
            f"inalterados={self.inalterados} revisao={self.revisao} "
            f"erros={self.erros} fim={self.encerrado_por}"
        )
        if self.ignorados_filtro:
            base += f" ignorados_filtro={self.ignorados_filtro}"
        return base


class Runner:
    def __init__(self, adapter: Adapter, client: PoliteClient, storage: Storage) -> None:
        self.adapter = adapter
        self.client = client
        self.storage = storage
        self.cfg = adapter.cfg

    def coletar(
        self, limite: int | None = None, tipo_anunciante: str | None = None
    ) -> ResultadoColeta:
        """`tipo_anunciante` ("particular"/"loja") filtra o que é salvo, não o
        que é requisitado — só se sabe o tipo depois de parsear a página do
        anúncio (SPEC: sem heurística de listagem). Anúncio filtrado ainda
        conta pra early stop normalmente: o conteúdo dele é novo/mudou, só
        não interessa pro pedido atual."""
        res = ResultadoColeta(fonte=self.cfg.fonte)
        if not self.cfg.ativa:
            res.encerrado_por = "fonte inativa"
            return res

        conhecidos_seguidos = 0
        processados = 0

        try:
            for url in self._urls_de_anuncio(res):
                if limite is not None and processados >= limite:
                    res.encerrado_por = "limite"
                    break

                estado = self.storage.estado_do_anuncio(self.cfg.fonte, url)
                resposta = self.client.get(
                    url,
                    etag=estado.etag if estado else None,
                    last_modified=estado.last_modified if estado else None,
                )
                res.requisicoes += 1
                processados += 1

                if resposta.nao_modificado:
                    res.nao_modificados += 1
                    res.inalterados += 1
                    self.storage.marcar_visto(self.cfg.fonte, url)
                    conhecidos_seguidos += 1
                    if self._parar(conhecidos_seguidos, res):
                        break
                    continue

                if not resposta.ok or resposta.html is None:
                    res.erros += 1
                    conhecidos_seguidos = 0
                    continue

                bruto = self.adapter.parse_anuncio(resposta.html, resposta.url)
                if bruto is None:
                    res.erros += 1
                    continue

                if estado and estado.content_hash == bruto.content_hash():
                    res.inalterados += 1
                    self.storage.marcar_visto(self.cfg.fonte, url)
                    conhecidos_seguidos += 1
                    if self._parar(conhecidos_seguidos, res):
                        break
                    continue

                conhecidos_seguidos = 0
                veiculo = normalizar(bruto)

                if tipo_anunciante is not None and veiculo.tipo_anunciante != tipo_anunciante:
                    res.ignorados_filtro += 1
                    continue

                pendencias = precisa_revisao(veiculo)
                if pendencias:
                    res.revisao += 1

                novo = self.storage.salvar(
                    veiculo,
                    raw=bruto.raw,
                    etag=resposta.etag,
                    last_modified=resposta.last_modified,
                    pendencias=pendencias,
                )
                if novo:
                    res.novos += 1
                else:
                    res.atualizados += 1

        except FontePausada as exc:
            res.encerrado_por = f"circuito aberto: {exc}"
            log.warning("%s", exc)
        except ForaDaJanela as exc:
            res.encerrado_por = "fora da janela"
            log.info("%s", exc)
        except BloqueadoPorRobots as exc:
            res.encerrado_por = "robots.txt"
            log.warning("%s", exc)

        res.scrape_run_id = self.storage.registrar_execucao(res)
        return res

    def _parar(self, conhecidos_seguidos: int, res: ResultadoColeta) -> bool:
        if conhecidos_seguidos >= self.cfg.early_stop_n:
            res.encerrado_por = f"early stop ({conhecidos_seguidos} conhecidos)"
            log.info("%s: %s", self.cfg.fonte, res.encerrado_por)
            return True
        return False

    def _urls_de_anuncio(self, res: ResultadoColeta) -> Iterator[str]:
        """Sitemap primeiro; paginação de listagem como fallback."""
        if self.cfg.usar_sitemap:
            achou = False
            for url in urls_de_sitemap(self.client, self.cfg.base_url, res):
                achou = True
                yield url
            if achou:
                return
            log.info("%s: sem sitemap utilizável, caindo para listagem", self.cfg.fonte)

        for url_listagem in self.adapter.urls_de_listagem():
            pagina = url_listagem
            while pagina:
                resposta = self.client.get(pagina)
                res.requisicoes += 1
                if not resposta.ok or resposta.html is None:
                    res.erros += 1
                    break
                yield from self.adapter.urls_de_anuncio(resposta.html, pagina)
                pagina = self.adapter.proxima_pagina(resposta.html, pagina)

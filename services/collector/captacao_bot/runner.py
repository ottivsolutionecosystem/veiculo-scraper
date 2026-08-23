"""Orquestração da coleta.

O runner é quem gasta requisição, então é quem carrega as regras de economia.
A coleta tem duas fases:

1. **Enumerar** — pagina a listagem (com o filtro nativo da fonte) e monta o
   conjunto de anúncios que estão no ar agora, já com o preço que o card
   mostra. ~80 requisições cobrem as 1546 do Shopcar.
2. **Detalhar** — abre a ficha só de quem é novo, mudou de preço na listagem,
   voltou do ar ou está sem revisita há muito tempo. Quem não mudou custa
   zero requisição.

No fim, a fase 1 é o que autoriza a varredura: anúncio ativo que não apareceu
na enumeração completa saiu do ar e é desativado (nunca deletado).

Sitemap, quando a fonte tem, não dá preço nem lista fechada — nesse caso a
enumeração continua valendo como fonte de URLs, mas sem varredura.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from .adapters.base import Adapter
from .http_client import (
    BloqueadoPorRobots,
    FontePausada,
    ForaDaJanela,
    PoliteClient,
)
from .models import CardListagem
from .normalize import extrair_preco
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
    precos_alterados: int = 0
    desativados: int = 0
    anuncios_no_ar: int = 0
    paginas_listagem: int = 0
    # "listagem" | "fichas" — a tela Fontes troca o texto da barra.
    fase: str = "listagem"
    tipo_anunciante_filtro: str | None = None
    encerrado_por: str = "fim"
    iniciado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    scrape_run_id: int | None = None  # preenchido por registrar_execucao (só PostgresStorage)

    def resumo(self) -> str:
        base = (
            f"[{self.fonte}] req={self.requisicoes} no_ar={self.anuncios_no_ar} "
            f"novos={self.novos} atualizados={self.atualizados} "
            f"precos={self.precos_alterados} inalterados={self.inalterados} "
            f"sairam={self.desativados} revisao={self.revisao} "
            f"erros={self.erros} fim={self.encerrado_por}"
        )
        if self.ignorados_filtro:
            base += f" ignorados_filtro={self.ignorados_filtro}"
        return base

    def progresso(self) -> dict:
        """O que a tela Fontes mostra enquanto a coleta anda."""
        return {
            "no_ar": self.anuncios_no_ar,
            "paginas": self.paginas_listagem,
            "requisicoes": self.requisicoes,
            "novos": self.novos,
            "atualizados": self.atualizados,
            "precos_alterados": self.precos_alterados,
            "inalterados": self.inalterados,
            "desativados": self.desativados,
            "erros": self.erros,
            "fase": self.fase,
        }


class Runner:
    def __init__(self, adapter: Adapter, client: PoliteClient, storage: Storage) -> None:
        self.adapter = adapter
        self.client = client
        self.storage = storage
        self.cfg = adapter.cfg

    def coletar(
        self,
        limite: int | None = None,
        tipo_anunciante: str | None = None,
        ao_progredir: Callable[[ResultadoColeta], None] | None = None,
    ) -> ResultadoColeta:
        """`tipo_anunciante` vira filtro na URL da listagem (Shopcar:
        `tipoanuncio=`) e ainda barra o que a ficha contradiz."""
        res = ResultadoColeta(fonte=self.cfg.fonte, tipo_anunciante_filtro=tipo_anunciante)
        if not self.cfg.ativa:
            res.encerrado_por = "fonte inativa"
            return res

        try:
            cards, enumeracao_completa = self._enumerar(
                res, tipo_anunciante, ao_progredir
            )
            res.anuncios_no_ar = len(cards)
            res.fase = "fichas"
            self._notificar(res, ao_progredir)

            self._detalhar(res, cards, limite, tipo_anunciante, ao_progredir)

            # Quem decide "ainda está no ar" é a enumeração, não a ficha: o
            # limite corta só quantas fichas abrimos. Enquanto a listagem foi
            # lida até o fim, a lista de ids no ar está completa e a varredura
            # é segura.
            if enumeracao_completa and res.encerrado_por in ("fim", "limite"):
                res.desativados = self.storage.desativar_ausentes(
                    self.cfg.fonte, tipo_anunciante, [c.id_externo for c in cards]
                )
            else:
                log.info(
                    "%s: enumeração incompleta (%s), varredura de fora do ar não roda",
                    self.cfg.fonte,
                    res.encerrado_por,
                )

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
        self._notificar(res, ao_progredir)
        return res

    def _notificar(
        self, res: ResultadoColeta, ao_progredir: Callable[[ResultadoColeta], None] | None
    ) -> None:
        if ao_progredir is None:
            return
        try:
            ao_progredir(res)
        except Exception as exc:  # progresso é enfeite: não derruba a coleta
            log.warning("%s: falha ao publicar progresso: %s", self.cfg.fonte, exc)

    def _enumerar(
        self,
        res: ResultadoColeta,
        tipo_anunciante: str | None,
        ao_progredir: Callable[[ResultadoColeta], None] | None = None,
    ) -> tuple[list[CardListagem], bool]:
        """Fase 1. Devolve os cards no ar e se a enumeração chegou ao fim —
        varredura de fora do ar só é segura quando chegou."""
        res.fase = "listagem"
        if self.cfg.usar_sitemap:
            urls = list(urls_de_sitemap(self.client, self.cfg.base_url, res))
            if urls:
                cards = [
                    CardListagem(url=u, id_externo=self.adapter.id_externo(u)) for u in urls
                ]
                res.anuncios_no_ar = len(cards)
                self._notificar(res, ao_progredir)
                # Sitemap não é filtrado por tipo de anunciante: sem varredura.
                return cards, tipo_anunciante is None
            log.info("%s: sem sitemap utilizável, caindo para listagem", self.cfg.fonte)

        cards: list[CardListagem] = []
        vistos: set[str] = set()
        completa = True

        for url_listagem in self.adapter.urls_de_listagem(tipo_anunciante):
            pagina: str | None = url_listagem
            while pagina:
                resposta = self.client.get(pagina)
                res.requisicoes += 1
                if not resposta.ok or resposta.html is None:
                    res.erros += 1
                    self._notificar(res, ao_progredir)
                    completa = False
                    break
                res.paginas_listagem += 1
                for card in self.adapter.cards_de_listagem(resposta.html, pagina):
                    if card.id_externo in vistos:
                        continue
                    if (
                        tipo_anunciante is not None
                        and card.tipo_anunciante is not None
                        and card.tipo_anunciante != tipo_anunciante
                    ):
                        res.ignorados_filtro += 1
                        continue
                    vistos.add(card.id_externo)
                    cards.append(card)
                res.anuncios_no_ar = len(cards)
                self._notificar(res, ao_progredir)
                pagina = self.adapter.proxima_pagina(resposta.html, pagina)

        return cards, completa

    def _detalhar(
        self,
        res: ResultadoColeta,
        cards: list[CardListagem],
        limite: int | None,
        tipo_anunciante: str | None,
        ao_progredir: Callable[[ResultadoColeta], None] | None,
    ) -> None:
        """Fase 2. Abre ficha só de quem tem motivo."""
        agora = datetime.now(timezone.utc)
        revisita = timedelta(days=self.cfg.revisita_dias)
        abertos = 0

        for indice, card in enumerate(cards):
            if limite is not None and abertos >= limite:
                res.encerrado_por = "limite"
                break

            estado = self.storage.estado_do_anuncio(self.cfg.fonte, card.url)
            if estado is not None and not self._precisa_abrir(estado, card, agora, revisita):
                res.inalterados += 1
                self.storage.marcar_visto(self.cfg.fonte, card.url)
                if indice % 5 == 0:
                    self._notificar(res, ao_progredir)
                continue

            resposta = self.client.get(
                card.url,
                etag=estado.etag if estado else None,
                last_modified=estado.last_modified if estado else None,
            )
            res.requisicoes += 1
            abertos += 1

            if resposta.nao_modificado:
                res.nao_modificados += 1
                res.inalterados += 1
                self.storage.marcar_visto(self.cfg.fonte, card.url)
                continue

            if not resposta.ok or resposta.html is None:
                res.erros += 1
                continue

            bruto = self.adapter.parse_anuncio(resposta.html, resposta.url)
            if bruto is None:
                res.erros += 1
                continue

            if estado and estado.content_hash == bruto.content_hash() and estado.ativo:
                res.inalterados += 1
                self.storage.marcar_visto(self.cfg.fonte, card.url)
                continue

            veiculo = normalizar(bruto)

            # A listagem filtrada já garante o tipo; a ficha é a segunda
            # opinião. Contradição não entra no balde errado — fica de fora.
            if tipo_anunciante is not None:
                if veiculo.tipo_anunciante is None:
                    veiculo.tipo_anunciante = tipo_anunciante
                elif veiculo.tipo_anunciante != tipo_anunciante:
                    res.ignorados_filtro += 1
                    log.info(
                        "%s: %s é %s na ficha, listagem pediu %s — ignorado",
                        self.cfg.fonte, card.id_externo,
                        veiculo.tipo_anunciante, tipo_anunciante,
                    )
                    continue

            pendencias = precisa_revisao(veiculo)
            if pendencias:
                res.revisao += 1

            salvo = self.storage.salvar(
                veiculo,
                raw=bruto.raw,
                etag=resposta.etag,
                last_modified=resposta.last_modified,
                pendencias=pendencias,
            )
            if salvo.novo:
                res.novos += 1
            else:
                res.atualizados += 1
                if salvo.preco_mudou:
                    res.precos_alterados += 1

            if indice % 5 == 0:
                self._notificar(res, ao_progredir)

    def _precisa_abrir(
        self, estado, card: CardListagem, agora: datetime, revisita: timedelta
    ) -> bool:
        """Sem motivo, não abre. Cada `False` aqui é uma requisição poupada."""
        if not estado.ativo or estado.content_hash is None:
            return True
        preco_card = extrair_preco(card.preco_texto)
        if preco_card is not None and preco_card != estado.preco:
            return True
        if estado.ultima_vista_em is None:
            return True
        return agora - estado.ultima_vista_em > revisita

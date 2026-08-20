"""Contrato único de adapter.

Um adapter sabe duas coisas: onde estão as URLs de anúncio, e como transformar
o HTML de um anúncio em `AnuncioBruto`. Todo o resto (ritmo, robots, retry,
circuito, early stop, persistência) é do runner. Adapter não faz requisição
por conta própria.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator

from ..config import AdapterConfig
from ..models import AnuncioBruto, CardListagem


class Adapter(ABC):
    cfg: AdapterConfig

    def __init__(self, cfg: AdapterConfig) -> None:
        self.cfg = cfg

    @abstractmethod
    def urls_de_anuncio(self, html_listagem: str, base_url: str) -> list[str]:
        """URLs de anúncio extraídas de uma página de listagem."""

    def cards_de_listagem(self, html_listagem: str, base_url: str) -> list[CardListagem]:
        """Cards da listagem com o que der para ler sem abrir a ficha.
        Sobrescreva quando a listagem já mostrar preço: é o que permite
        pular a ficha de anúncio que não mudou."""
        return [
            CardListagem(url=url, id_externo=self.id_externo(url))
            for url in self.urls_de_anuncio(html_listagem, base_url)
        ]

    @abstractmethod
    def proxima_pagina(self, html_listagem: str, base_url: str) -> str | None:
        """URL da próxima página de listagem, ou None no fim."""

    @abstractmethod
    def parse_anuncio(self, html: str, url: str) -> AnuncioBruto | None:
        """HTML de um anúncio → AnuncioBruto. None quando a página não é
        um anúncio válido (removido, 404 mascarado como 200)."""

    def urls_de_listagem(self, tipo_anunciante: str | None = None) -> Iterator[str]:
        """Pontos de partida da coleta. `tipo_anunciante` ("particular"/"loja")
        deve virar filtro na URL da fonte quando ela oferece isso — não
        gastar request em ficha só para descartar depois."""
        raise NotImplementedError

    def id_externo(self, url: str) -> str:
        """Identificador estável do anúncio dentro da fonte."""
        return url.rstrip("/").rsplit("/", 1)[-1]

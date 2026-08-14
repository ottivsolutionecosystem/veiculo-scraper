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
from ..models import AnuncioBruto


class Adapter(ABC):
    cfg: AdapterConfig

    def __init__(self, cfg: AdapterConfig) -> None:
        self.cfg = cfg

    @abstractmethod
    def urls_de_anuncio(self, html_listagem: str, base_url: str) -> list[str]:
        """URLs de anúncio extraídas de uma página de listagem."""

    @abstractmethod
    def proxima_pagina(self, html_listagem: str, base_url: str) -> str | None:
        """URL da próxima página de listagem, ou None no fim."""

    @abstractmethod
    def parse_anuncio(self, html: str, url: str) -> AnuncioBruto | None:
        """HTML de um anúncio → AnuncioBruto. None quando a página não é
        um anúncio válido (removido, 404 mascarado como 200)."""

    @abstractmethod
    def urls_de_listagem(self) -> Iterator[str]:
        """Pontos de partida da coleta (categorias, buscas, páginas de estoque)."""

    def id_externo(self, url: str) -> str:
        """Identificador estável do anúncio dentro da fonte."""
        return url.rstrip("/").rsplit("/", 1)[-1]

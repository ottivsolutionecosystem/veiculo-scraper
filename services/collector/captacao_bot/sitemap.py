"""Sitemap: a forma mais barata e mais educada de descobrir URLs.

Uma requisição de sitemap costuma render centenas de URLs de anúncio. Paginar
listagem custa uma requisição a cada ~20 URLs. Onde houver sitemap, use.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Iterator
from urllib.parse import urljoin

log = logging.getLogger(__name__)

_LOC_RE = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>", re.IGNORECASE)

CAMINHOS_SITEMAP = (
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap-index.xml",
)

# Só interessa URL que parece anúncio de veículo.
PADRAO_ANUNCIO = re.compile(
    r"/(veiculo|veiculos|anuncio|anuncios|carro|carros|estoque)/", re.IGNORECASE
)


def _locs(xml: str) -> list[str]:
    return _LOC_RE.findall(xml)


def urls_de_sitemap(client, base_url: str, res=None, max_sitemaps: int = 20) -> Iterator[str]:
    """URLs de anúncio a partir do sitemap. Silencioso quando não existe."""
    raiz = None
    for caminho in CAMINHOS_SITEMAP:
        url = urljoin(base_url, caminho)
        resposta = client.get(url)
        if res is not None:
            res.requisicoes += 1
        if resposta.ok and resposta.html and "<loc" in resposta.html.lower():
            raiz = resposta.html
            log.info("sitemap encontrado em %s", url)
            break

    if raiz is None:
        return

    locs = _locs(raiz)
    filhos = [u for u in locs if u.lower().endswith((".xml", ".xml.gz"))]

    if not filhos:
        yield from (u for u in locs if PADRAO_ANUNCIO.search(u))
        return

    for sub in filhos[:max_sitemaps]:
        resposta = client.get(sub)
        if res is not None:
            res.requisicoes += 1
        if not resposta.ok or not resposta.html:
            continue
        yield from (u for u in _locs(resposta.html) if PADRAO_ANUNCIO.search(u))

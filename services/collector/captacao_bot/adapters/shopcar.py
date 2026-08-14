"""Adapter shopcar.com.br — nível de acesso: público educado.

ATENÇÃO, LEIA ANTES DE RODAR EM PRODUÇÃO
========================================
Os seletores CSS em `SELETORES` são uma hipótese: foram escritos sem acesso à
página real. Antes do primeiro uso:

    python -m captacao_bot.cli fixture --fonte shopcar --url <URL de anúncio>

Isso salva o HTML em tests/fixtures/. Ajuste `SELETORES` até
`test_shopcar_adapter.py` passar contra o HTML real salvo. Nunca ajuste o
seletor "no ar" contra o site: cada tentativa é uma requisição, e é assim que
se toma bloqueio.

ESTRATÉGIA DE EXTRAÇÃO
======================
1. JSON-LD (schema.org Vehicle / Car / Product) — quando existe, é o caminho
   estável: sobrevive a redesign, é o que o próprio site publica para o Google.
2. Microdata / meta og: — segunda tentativa.
3. Seletores CSS — último recurso, o que quebra primeiro.

Sempre nessa ordem. Adapter que começa por CSS quebra a cada layout novo.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterator
from urllib.parse import urljoin

from selectolax.parser import HTMLParser

from ..models import AnuncioBruto
from .base import Adapter

# ---- hipótese de seletores; verificar contra fixture real ----
SELETORES = {
    "card_anuncio": "a[href*='/veiculo/'], a[href*='/anuncio/'], .veiculo-card a",
    "proxima_pagina": "a[rel='next'], .pagination a.next, a[aria-label='Próxima']",
    "titulo": "h1, .veiculo-titulo, [itemprop='name']",
    "preco": ".preco, .valor, [itemprop='price']",
    "km": ".km, .quilometragem, [data-km]",
    "ano": ".ano, .ano-modelo, [data-ano]",
    "cambio": ".cambio, [data-cambio]",
    "combustivel": ".combustivel, [data-combustivel]",
    "cor": ".cor, [data-cor]",
    "cidade": ".cidade, .localizacao, [itemprop='addressLocality']",
    "fotos": ".galeria img, [itemprop='image']",
    "vendedor": ".vendedor-nome, .loja-nome",
}

TIPOS_JSONLD = {"Vehicle", "Car", "Product", "Motorcycle"}


def _texto(node) -> str | None:
    if node is None:
        return None
    t = node.text(strip=True)
    return t or None


def _primeiro(tree: HTMLParser, seletor: str) -> str | None:
    for parte in seletor.split(","):
        node = tree.css_first(parte.strip())
        if node is not None:
            texto = _texto(node)
            if texto:
                return texto
    return None


def extrair_jsonld(tree: HTMLParser) -> dict | None:
    """Primeiro bloco JSON-LD que descreve um veículo."""
    for script in tree.css("script[type='application/ld+json']"):
        conteudo = script.text(strip=True)
        if not conteudo:
            continue
        try:
            dados = json.loads(conteudo)
        except json.JSONDecodeError:
            continue
        for item in _achatar_jsonld(dados):
            tipo = item.get("@type")
            tipos = {tipo} if isinstance(tipo, str) else set(tipo or [])
            if tipos & TIPOS_JSONLD:
                return item
    return None


def _achatar_jsonld(dados) -> Iterator[dict]:
    if isinstance(dados, list):
        for d in dados:
            yield from _achatar_jsonld(d)
    elif isinstance(dados, dict):
        yield dados
        for chave in ("@graph", "itemListElement", "mainEntity"):
            if chave in dados:
                yield from _achatar_jsonld(dados[chave])


class ShopcarAdapter(Adapter):
    def urls_de_listagem(self) -> Iterator[str]:
        # Sitemap é o caminho preferido (config.usar_sitemap=True); estas URLs
        # são o fallback quando o sitemap não cobre a categoria.
        yield urljoin(self.cfg.base_url, "/veiculos/carros/")

    def urls_de_anuncio(self, html_listagem: str, base_url: str) -> list[str]:
        tree = HTMLParser(html_listagem)
        urls: list[str] = []
        vistos: set[str] = set()
        for seletor in SELETORES["card_anuncio"].split(","):
            for node in tree.css(seletor.strip()):
                href = node.attributes.get("href")
                if not href:
                    continue
                absoluta = urljoin(base_url, href).split("#")[0]
                if absoluta not in vistos:
                    vistos.add(absoluta)
                    urls.append(absoluta)
        return urls

    def proxima_pagina(self, html_listagem: str, base_url: str) -> str | None:
        tree = HTMLParser(html_listagem)
        for seletor in SELETORES["proxima_pagina"].split(","):
            node = tree.css_first(seletor.strip())
            if node is not None:
                href = node.attributes.get("href")
                if href:
                    return urljoin(base_url, href)
        return None

    def parse_anuncio(self, html: str, url: str) -> AnuncioBruto | None:
        tree = HTMLParser(html)
        jsonld = extrair_jsonld(tree)

        titulo = None
        preco = None
        fotos: list[str] = []
        km = None
        cor = None
        cidade = None

        if jsonld:
            titulo = jsonld.get("name")
            oferta = jsonld.get("offers") or {}
            if isinstance(oferta, list):
                oferta = oferta[0] if oferta else {}
            if isinstance(oferta, dict) and oferta.get("price") is not None:
                preco = str(oferta.get("price"))
            imagem = jsonld.get("image")
            if isinstance(imagem, str):
                fotos = [imagem]
            elif isinstance(imagem, list):
                fotos = [i for i in imagem if isinstance(i, str)]
            odometro = jsonld.get("mileageFromOdometer")
            if isinstance(odometro, dict):
                km = f"{odometro.get('value')} {odometro.get('unitCode', 'KM')}"
            elif odometro is not None:
                km = str(odometro)
            cor = jsonld.get("color")
            ano_jsonld = jsonld.get("modelDate") or jsonld.get("productionDate")
        else:
            ano_jsonld = None

        # Fallbacks, na ordem: meta og → CSS.
        if not titulo:
            og = tree.css_first("meta[property='og:title']")
            titulo = og.attributes.get("content") if og else None
        if not titulo:
            titulo = _primeiro(tree, SELETORES["titulo"])
        if not titulo:
            return None  # sem título não é anúncio

        if not preco:
            preco = _primeiro(tree, SELETORES["preco"])
        if not km:
            km = _primeiro(tree, SELETORES["km"])
        if not cor:
            cor = _primeiro(tree, SELETORES["cor"])
        if not cidade:
            cidade = _primeiro(tree, SELETORES["cidade"])
        if not fotos:
            fotos = [
                src
                for node in tree.css(SELETORES["fotos"].split(",")[0].strip())
                if (src := node.attributes.get("src") or node.attributes.get("data-src"))
            ]

        ano = str(ano_jsonld) if ano_jsonld else _primeiro(tree, SELETORES["ano"])

        return AnuncioBruto(
            fonte=self.cfg.fonte,
            id_externo=self.id_externo(url),
            url=url,
            titulo=titulo.strip(),
            preco_texto=preco,
            km_texto=km,
            ano_texto=ano,
            cambio_texto=_primeiro(tree, SELETORES["cambio"]),
            combustivel_texto=_primeiro(tree, SELETORES["combustivel"]),
            cor_texto=cor,
            cidade_texto=cidade,
            fotos=[urljoin(url, f) for f in fotos][:20],
            vendedor_nome=_primeiro(tree, SELETORES["vendedor"]),
            # Telefone NÃO é coletado aqui. Contato entra pelo fluxo com base
            # legal registrada e mascaramento (seção 4.7 do SPEC).
            vendedor_telefone=None,
            raw={"jsonld": jsonld} if jsonld else {},
        )

    def id_externo(self, url: str) -> str:
        m = re.search(r"/(\d{4,})(?:[/?#]|$)", url)
        if m:
            return m.group(1)
        return url.rstrip("/").rsplit("/", 1)[-1] or url

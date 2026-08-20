"""Adapter shopcar.com.br — nível de acesso: público educado.

Três decisões que sustentam a assertividade, todas conferidas contra HTML
real (tests/fixtures/shopcar_anuncio.html = particular,
shopcar_anuncio_loja.html = loja, shopcar_busca.html = listagem):

1. Listagem usa o filtro nativo do site (`tipoanuncio=1` loja, `=2`
   particular). Quem separa loja de particular é o próprio Shopcar.
2. Tipo do anunciante vem de dois sinais independentes na ficha — o logo do
   bloco `#anunciante` e o bucket da foto principal. Se discordarem, o
   anúncio vai para revisão em vez de ser chutado. O JSON-LD `Organization`
   "Shopcar" é o site, nunca o vendedor.
3. Título vem do JSON-LD no formato "MARCA - Categoria - Modelo Versão".
   A categoria é removida: "Picape Média" não é parte do nome do carro e
   envenenava o match FIPE.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterator
from urllib.parse import parse_qs, urlencode, urljoin, urlparse, urlunparse

from selectolax.parser import HTMLParser

from ..models import AnuncioBruto, CardListagem
from ..normalize import sem_acento
from .base import Adapter

# Conferido contra tests/fixtures/shopcar_busca.html e shopcar_anuncio.html
# (HTML real de 2026-08-17). URL: /veiculos/{marca}/{slug}/{aa-aa}/{id}
SELETORES = {
    # Só o bloco da busca — "mais ofertas" e laterais ficam de fora.
    "card_anuncio": "#buscaListagemV2 a.link[href*='/veiculos/']",
    "proxima_pagina": ".paginacao a",
    "titulo": "h1, .modelo, .veiculo-titulo, [itemprop='name']",
    "preco": ".barra-preco, .preco, .valor, [itemprop='price']",
    "km": ".caract-km, .km, .quilometragem, [data-km]",
    "ano": ".caract-anomodelo, .ano, .ano-modelo, [data-ano]",
    "cambio": ".caract-cambio, .cambio, [data-cambio]",
    "combustivel": ".caract-combust, .combustivel, [data-combustivel]",
    "cor": ".caract-cor, .cor, [data-cor]",
    "cidade": "#anunciante .endereco, .cidade, .localizacao, [itemprop='addressLocality']",
    "fotos": "a.fotogroup, .galeria img, [itemprop='image']",
}

_RE_ANUNCIO = re.compile(r"/veiculos/[^/]+/[^/]+/[^/]+/(\d+)(?:[/?#]|$)")

# tipo=1 carros. tipoanuncio é o filtro nativo do Shopcar (não heurística).
TIPOANUNCIO = {"loja": "1", "particular": "2"}

TIPOS_JSONLD = {"Vehicle", "Car", "Product", "Motorcycle"}

# Primeira palavra dos segmentos de categoria do Shopcar ("Picape Média",
# "SUV Sub", "Sedã Grande", "SW Média", "Conversível"...). Nenhuma marca nem
# modelo começa com uma delas, então dá para achar a categoria por posição.
_CATEGORIA_INICIO = frozenset(
    {
        "PICAPE", "SUV", "SEDA", "HATCH", "MPV", "SW", "VAN", "CONVERSIVEL",
        "ESPORTIVO", "ANTIGO", "UTILITARIO", "FURGAO", "MINIVAN", "JIPE",
        "BUGGY", "CAMINHAO", "ONIBUS", "MOTO", "MOTOCICLETA",
    }
)


def separar_nome(nome: str) -> tuple[str | None, str | None, str]:
    """"JEEP - SUV Médio - Compass Limited 1.3 16v T270" ->
    ("JEEP", "SUV Médio", "Compass Limited 1.3 16v T270").

    A marca pode ter hífen no nome do próprio Shopcar ("GM - Chevrolet",
    "VW - VolksWagen"), então quem delimita é a categoria, não a posição.
    """
    partes = [p.strip() for p in nome.split(" - ") if p.strip()]
    if len(partes) < 2:
        return None, None, nome.strip()

    for i in range(1, len(partes) - 1):
        primeira = sem_acento(partes[i]).upper().split()
        if primeira and primeira[0] in _CATEGORIA_INICIO:
            return " ".join(partes[:i]), partes[i], " - ".join(partes[i + 1 :])

    return partes[0], None, " - ".join(partes[1:])


def _oferta(jsonld: dict | None) -> dict:
    if not jsonld:
        return {}
    oferta = jsonld.get("offers") or {}
    if isinstance(oferta, list):
        oferta = oferta[0] if oferta else {}
    return oferta if isinstance(oferta, dict) else {}


def _tipo_pelo_anunciante(tree: HTMLParser) -> tuple[str | None, str | None]:
    """Bloco `#anunciante`: logo `images/anunciante_particular.png` para
    particular, `/stored/lojas/<id>.png` para loja. Nada além disso conta."""
    bloco = tree.css_first("#anunciante")
    if bloco is None:
        return None, None

    nome = _texto(bloco.css_first(".nome"))
    logo = bloco.css_first(".logomarca img") or bloco.css_first("img")
    if logo is None:
        return None, nome

    src = logo.attributes.get("src") or ""
    alt = sem_acento(logo.attributes.get("alt") or "").upper()
    if "anunciante_particular" in src or "ANUNCIANTE PARTICULAR" in alt:
        return "particular", nome
    if "/stored/lojas/" in src:
        return "loja", nome
    return None, nome


def _tipo_pela_foto(foto_principal: str | None) -> str | None:
    """Só o bucket `/stored/veiculos/particular/` conta. Foto em
    `/stored/veiculos/` sem particular NÃO é loja — loja e particular
    compartilham esse path, e tratar isso como loja misturava os baldes."""
    if not foto_principal:
        return None
    if "/stored/veiculos/particular/" in foto_principal:
        return "particular"
    return None


def tipo_do_card(html_card: str) -> str | None:
    """Sinal da linha da busca, sem abrir a ficha. Logo `/stored/lojas/` é
    loja; foto ou texto de anunciante particular é particular."""
    baixo = html_card.lower()
    if "/stored/lojas/" in baixo:
        return "loja"
    if "/stored/veiculos/particular/" in baixo or "anunciante particular" in baixo:
        return "particular"
    return None


def detectar_tipo_anunciante(
    tree: HTMLParser, foto_principal: str | None
) -> tuple[str | None, str | None]:
    """Dois sinais independentes têm que concordar. Discordância devolve
    None: anúncio ambíguo vai para revisão, não para o balde errado."""
    pelo_bloco, nome = _tipo_pelo_anunciante(tree)
    pela_foto = _tipo_pela_foto(foto_principal)

    if pelo_bloco and pela_foto and pelo_bloco != pela_foto:
        return None, nome
    return pelo_bloco or pela_foto, nome


def _texto(node) -> str | None:
    if node is None:
        return None
    # O Shopcar escreve "R$&nbsp;159.900,00". Comparar preço de card entre
    # duas coletas exige o texto estável.
    t = node.text(strip=True).replace("\xa0", " ").strip()
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
    """Primeiro bloco JSON-LD que descreve um veículo (não a Organization Shopcar)."""
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
    def urls_de_listagem(self, tipo_anunciante: str | None = None) -> Iterator[str]:
        # Filtra na URL do Shopcar — 1546 particulares, não 18 mil misturados.
        if tipo_anunciante in TIPOANUNCIO:
            yield urljoin(
                self.cfg.base_url,
                f"/busca.php?tipo=1&tipoanuncio={TIPOANUNCIO[tipo_anunciante]}",
            )
            return
        yield urljoin(self.cfg.base_url, "/busca.php?tipo=1&tipoanuncio=2")
        yield urljoin(self.cfg.base_url, "/busca.php?tipo=1&tipoanuncio=1")

    def urls_de_anuncio(self, html_listagem: str, base_url: str) -> list[str]:
        return [card.url for card in self.cards_de_listagem(html_listagem, base_url)]

    def cards_de_listagem(self, html_listagem: str, base_url: str) -> list[CardListagem]:
        """Lê preço junto com a URL. Com o preço da listagem em mão o runner
        só abre a ficha de quem mudou — é o que faz uma revarredura das 1546
        custar ~80 requisições em vez de 1546."""
        tree = HTMLParser(html_listagem)
        cards: list[CardListagem] = []
        vistos: set[str] = set()
        nos = tree.css(SELETORES["card_anuncio"])
        if not nos:
            nos = tree.css("a.link[href*='/veiculos/']")
        for node in nos:
            href = node.attributes.get("href")
            if not href:
                continue
            absoluta = urljoin(base_url, href).split("#")[0]
            if not _RE_ANUNCIO.search(absoluta) or absoluta in vistos:
                continue
            vistos.add(absoluta)
            cards.append(
                CardListagem(
                    url=absoluta,
                    id_externo=self.id_externo(absoluta),
                    preco_texto=_texto(node.css_first(".preco")),
                    tipo_anunciante=tipo_do_card(node.html or ""),
                )
            )
        return cards

    def proxima_pagina(self, html_listagem: str, base_url: str) -> str | None:
        """O 'Próxima' do Shopcar às vezes cai `tipoanuncio`. A página
        seguinte é montada a partir da URL atual, não do href do site."""
        tree = HTMLParser(html_listagem)
        tem_proxima = any(
            "Próxima" in (node.text() or "") or "proxima" in (node.text() or "").lower()
            for node in tree.css(".paginacao a")
        )
        if not tem_proxima:
            return None
        parsed = urlparse(base_url)
        qs = {k: v[-1] for k, v in parse_qs(parsed.query, keep_blank_values=True).items()}
        pagina_atual = int(qs.get("pagina") or "1")
        qs["pagina"] = str(pagina_atual + 1)
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", urlencode(qs), ""))

    def parse_anuncio(self, html: str, url: str) -> AnuncioBruto | None:
        tree = HTMLParser(html)
        jsonld = extrair_jsonld(tree)

        titulo = None
        preco = None
        fotos: list[str] = []
        km = None
        cor = None
        cidade = None
        ano_jsonld = None
        nome_jsonld = None

        og_imagem = tree.css_first("meta[property='og:image']")
        foto_principal = og_imagem.attributes.get("content") if og_imagem else None

        if jsonld:
            nome_jsonld = jsonld.get("name")
            titulo = nome_jsonld
            oferta = _oferta(jsonld)
            if oferta.get("price") is not None:
                preco = str(oferta.get("price"))
            imagem = jsonld.get("image")
            if isinstance(imagem, str):
                fotos = [imagem]
            elif isinstance(imagem, list):
                fotos = [i for i in imagem if isinstance(i, str)]
            foto_principal = foto_principal or (fotos[0] if fotos else None)
            odometro = jsonld.get("mileageFromOdometer")
            if isinstance(odometro, dict):
                km = f"{odometro.get('value')} {odometro.get('unitCode', 'KM')}"
            elif odometro is not None:
                km = str(odometro)
            cor = jsonld.get("color")
            ano_jsonld = jsonld.get("modelDate") or jsonld.get("productionDate")

        if not titulo:
            og = tree.css_first("meta[property='og:title']")
            titulo = og.attributes.get("content") if og else None
        if not titulo:
            titulo = _primeiro(tree, SELETORES["titulo"])
        if not titulo:
            return None

        if not preco:
            preco = _primeiro(tree, SELETORES["preco"])
        if not km:
            km = _primeiro(tree, SELETORES["km"])
        if not cor:
            cor = _primeiro(tree, SELETORES["cor"])
        if not cidade:
            cidade = _primeiro(tree, SELETORES["cidade"])
        if not fotos:
            for seletor in SELETORES["fotos"].split(","):
                for node in tree.css(seletor.strip()):
                    src = (
                        node.attributes.get("href")
                        or node.attributes.get("src")
                        or node.attributes.get("data-src")
                        or node.attributes.get("data-id")
                    )
                    if src and src.startswith("http"):
                        fotos.append(src)
                if fotos:
                    break

        ano = str(ano_jsonld) if ano_jsonld else _primeiro(tree, SELETORES["ano"])
        tipo_anunciante, vendedor_nome = detectar_tipo_anunciante(tree, foto_principal)

        # Só o JSON-LD tem o formato "MARCA - Categoria - Modelo Versão".
        # og:title e h1 não têm categoria para tirar.
        categoria = None
        modelo_versao = None
        marca_texto = None
        if nome_jsonld:
            marca_texto, categoria, modelo_versao = separar_nome(str(nome_jsonld))
            if marca_texto and modelo_versao:
                titulo = f"{marca_texto} {modelo_versao}"
            else:
                # Sem o formato "MARCA - ... - Modelo Versão" não há marca nem
                # modelo separados: o texto inteiro é título, e quem garimpa é
                # a normalização. Propagar aqui faria modelo = primeira palavra
                # do título, que é a marca.
                marca_texto, categoria, modelo_versao = None, None, None

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
            vendedor_nome=vendedor_nome,
            vendedor_telefone=None,
            vendedor_tipo=tipo_anunciante,
            marca_texto=marca_texto,
            modelo_versao_texto=modelo_versao,
            categoria=categoria,
            raw={"jsonld": jsonld} if jsonld else {},
        )

    def id_externo(self, url: str) -> str:
        m = re.search(r"/(\d{4,})(?:[/?#]|$)", url)
        if m:
            return m.group(1)
        return url.rstrip("/").rsplit("/", 1)[-1] or url

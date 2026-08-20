from dataclasses import replace
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import pytest

from captacao_bot import normalize as N
from captacao_bot.adapters.shopcar import ShopcarAdapter, separar_nome
from captacao_bot.config import FONTES
from captacao_bot.http_client import PoliteClient
from captacao_bot.models import AnuncioBruto, CardListagem
from captacao_bot.pipeline import fingerprint, normalizar, precisa_revisao
from captacao_bot.runner import Runner
from captacao_bot.storage import MemoryStorage

FIXTURES = Path(__file__).parent / "fixtures"

URL_PARTICULAR = (
    "https://www.shopcar.com.br/veiculos/toyota/"
    "hilux-srx-plus-d4-d-2-8tdi-16v-4x4-c-d/25-25/1626325"
)
URL_LOJA = (
    "https://www.shopcar.com.br/veiculos/jeep/compass-limited-1-3-16v-t270/24-25/1621390"
)


@pytest.fixture
def adapter():
    return ShopcarAdapter(FONTES["shopcar"])


class TestParseAnuncio:
    def test_jsonld_tem_prioridade(self, adapter):
        html = (FIXTURES / "anuncio_com_jsonld.html").read_text(encoding="utf-8")
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/98765")
        v = normalizar(bruto)

        assert v.marca == "TOYOTA"
        assert v.modelo == "COROLLA"
        assert v.ano_fabricacao == 2019 and v.ano_modelo == 2020
        assert v.km == 68450
        assert v.preco == 10_490_000
        assert v.cor == "PRATA"
        assert v.fotos[0].startswith("https://x.test/")
        assert precisa_revisao(v) == []

    def test_fallback_css_sem_jsonld(self, adapter):
        html = (FIXTURES / "anuncio_sem_jsonld.html").read_text(encoding="utf-8")
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1234")
        v = normalizar(bruto)

        assert v.marca == "VOLKSWAGEN" and v.modelo == "GOL"
        assert (v.ano_fabricacao, v.ano_modelo) == (2015, 2016)
        assert v.km == 112300
        assert v.preco == 4_290_000
        assert v.cambio == "MANUAL"
        assert (v.cidade, v.uf) == ("Dourados", "MS")
        assert "IPVA" not in v.titulo_normalizado

    def test_pagina_sem_titulo_devolve_none(self, adapter):
        assert adapter.parse_anuncio("<html><body>erro</body></html>", "https://x/1") is None

    def test_id_externo_estavel(self, adapter):
        assert adapter.id_externo("https://x.test/veiculo/98765") == "98765"
        assert adapter.id_externo("https://x.test/veiculo/98765/") == "98765"
        assert adapter.id_externo("https://x.test/veiculo/98765?utm=abc") == "98765"

    def test_telefone_nunca_e_coletado(self, adapter):
        html = (FIXTURES / "anuncio_com_jsonld.html").read_text(encoding="utf-8")
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_telefone is None

    def test_html_real_busca_extrai_anuncios_e_proxima(self, adapter):
        html = (FIXTURES / "shopcar_busca.html").read_text(encoding="utf-8")
        urls = adapter.urls_de_anuncio(html, "https://www.shopcar.com.br/busca.php?tipo=1")
        assert len(urls) >= 10
        assert all("/veiculos/" in u and u.rstrip("/").split("/")[-1].isdigit() for u in urls)
        proxima = adapter.proxima_pagina(html, "https://www.shopcar.com.br/busca.php?tipo=1")
        assert proxima and "pagina=2" in proxima
        # O Shopcar às vezes omite tipoanuncio no href "Próxima". A URL
        # seguinte tem que herdar o filtro da página atual.
        filtrada = adapter.proxima_pagina(
            html, "https://www.shopcar.com.br/busca.php?tipo=1&tipoanuncio=2"
        )
        assert filtrada and "tipoanuncio=2" in filtrada and "pagina=2" in filtrada

    def test_card_com_logo_de_loja_e_loja(self, adapter):
        html = (FIXTURES / "shopcar_busca.html").read_text(encoding="utf-8")
        cards = adapter.cards_de_listagem(html, "https://www.shopcar.com.br/busca.php?tipo=1")
        com_tipo = [c for c in cards if c.tipo_anunciante]
        assert com_tipo
        assert all(c.tipo_anunciante == "loja" for c in com_tipo)

    def test_html_real_anuncio_parseia(self, adapter):
        html = (FIXTURES / "shopcar_anuncio.html").read_text(encoding="utf-8")
        bruto = adapter.parse_anuncio(html, URL_PARTICULAR)
        assert bruto is not None
        v = normalizar(bruto)
        assert v.marca == "TOYOTA"
        assert "HILUX" in (v.modelo or "")
        assert v.preco == 30_500_000
        assert v.km == 19_000
        assert v.tipo_anunciante == "particular"
        assert bruto.vendedor_nome == "Patrick de Souza Barbosa"
        assert bruto.vendedor_telefone is None
        assert adapter.id_externo(URL_PARTICULAR) == "1626325"

    def test_listagem_filtra_na_url_do_shopcar(self, adapter):
        assert list(adapter.urls_de_listagem("particular")) == [
            "https://www.shopcar.com.br/busca.php?tipo=1&tipoanuncio=2",
        ]
        assert list(adapter.urls_de_listagem("loja")) == [
            "https://www.shopcar.com.br/busca.php?tipo=1&tipoanuncio=1",
        ]
        ambos = list(adapter.urls_de_listagem())
        assert ambos[0].endswith("tipoanuncio=2")
        assert ambos[1].endswith("tipoanuncio=1")

    def test_cards_da_listagem_trazem_preco(self, adapter):
        html = (FIXTURES / "shopcar_busca.html").read_text(encoding="utf-8")
        cards = adapter.cards_de_listagem(html, "https://www.shopcar.com.br/busca.php?tipo=1")
        assert len(cards) >= 10
        assert all(c.id_externo.isdigit() for c in cards)
        # Preço no card é o que dispensa abrir a ficha de quem não mudou.
        assert sum(1 for c in cards if c.preco_texto) >= len(cards) - 1
        primeiro = next(c for c in cards if c.id_externo == "1621390")
        assert primeiro.preco_texto == "R$ 159.900,00"


class TestSepararNome:
    """O JSON-LD do Shopcar vem "MARCA - Categoria - Modelo Versão". A
    categoria não é nome de carro e envenenava o match FIPE."""

    def test_marca_categoria_modelo(self):
        assert separar_nome("JEEP - SUV Médio - Compass Limited 1.3 16v T270") == (
            "JEEP", "SUV Médio", "Compass Limited 1.3 16v T270",
        )

    def test_marca_com_hifen_no_proprio_nome(self):
        assert separar_nome("GM - Chevrolet - Picape Média - S10 Advantage 2.4 C.D.") == (
            "GM Chevrolet", "Picape Média", "S10 Advantage 2.4 C.D.",
        )
        assert separar_nome("VW - VolksWagen - Hatch Pequeno - Gol 1.0 12v") == (
            "VW VolksWagen", "Hatch Pequeno", "Gol 1.0 12v",
        )

    def test_sem_categoria_conhecida_nao_come_o_modelo(self):
        assert separar_nome("RAM - 1500 Laramie 5.7 V8") == (
            "RAM", None, "1500 Laramie 5.7 V8",
        )

    def test_nome_de_uma_parte_fica_intacto(self):
        assert separar_nome("Corolla XEi 2.0") == (None, None, "Corolla XEi 2.0")

    def test_categoria_sai_do_titulo_e_versao_fica(self, adapter):
        html = (FIXTURES / "shopcar_anuncio.html").read_text(encoding="utf-8")
        bruto = adapter.parse_anuncio(html, URL_PARTICULAR)
        assert bruto.categoria == "Picape Média"
        assert "Picape" not in bruto.titulo
        v = normalizar(bruto)
        assert "PICAPE" not in v.titulo_normalizado
        assert v.modelo == "HILUX"
        assert v.versao == "SRX PLUS D4-D 2.8TDI 16V 4X4 C.D."


class TestMarcaEModelo:
    """A marca vem do campo próprio da fonte. Adivinhar pelo primeiro token do
    título fazia "VW Volkswagen Amarok" virar modelo=VOLKSWAGEN e
    "MERCEDES-BENZ C 180" virar marca=None — os dois iam para a fila de
    revisão FIPE sem nenhum candidato."""

    def test_marca_composta_nao_vira_modelo(self):
        assert N.marca_canonica("VW - VolksWagen") == "VOLKSWAGEN"
        assert N.marca_canonica("VW VolksWagen") == "VOLKSWAGEN"
        assert N.marca_canonica("GM - Chevrolet") == "CHEVROLET"
        assert N.marca_canonica("MERCEDES-BENZ") == "MERCEDES-BENZ"
        assert N.marca_canonica("CITROËN") == "CITROEN"
        assert N.marca_canonica("CHERY") == "CAOA CHERY"
        assert N.marca_canonica("Shop Car Motors") is None

    def test_modelo_pega_numero_do_nome_so_quando_e_nome(self):
        assert N.separar_modelo_versao("Amarok Highline 3.0TDi V6 24v 4x4 C.D.") == (
            "AMAROK", "HIGHLINE 3.0TDI V6 24V 4X4 C.D.",
        )
        # Mercedes nomeia modelo com número: "C 180" é o modelo, não versão.
        assert N.separar_modelo_versao("C 180 Exclusive 1.6T 16v", "MERCEDES-BENZ") == (
            "C 180", "EXCLUSIVE 1.6T 16V",
        )
        # Dígito solto também é nome ("Arrizo 6" ≠ "Arrizo 5").
        assert N.separar_modelo_versao("Arrizo 6 GSX 1.5T 16v") == ("ARRIZO 6", "GSX 1.5T 16V")
        # Cilindrada nunca entra no modelo.
        assert N.separar_modelo_versao("Argo Drive 1.3") == ("ARGO", "DRIVE 1.3")
        assert N.separar_modelo_versao("Corolla Cross XRE 2.0 16v") == (
            "COROLLA CROSS", "XRE 2.0 16V",
        )
        assert N.separar_modelo_versao("Yaris Cross XLS 1.5") == (
            "YARIS CROSS", "XLS 1.5",
        )
        assert N.separar_modelo_versao("C4 Cactus Feel 1.6") == (
            "C4 CACTUS", "FEEL 1.6",
        )
        assert N.separar_modelo_versao("Tiggo 7 Pro 1.6T") == (
            "TIGGO 7", "PRO 1.6T",
        )
        assert N.separar_modelo_versao("208 Allure 1.5") == ("208", "ALLURE 1.5")

    def test_carroceria_sai_do_modelo_e_da_versao(self):
        assert N.separar_modelo_versao("C3 Hatch Exclusive 1.4") == ("C3", "EXCLUSIVE 1.4")

    def test_titulo_sem_campo_de_marca_ainda_funciona(self):
        # Fallback: "VW Volkswagen" são dois tokens da mesma marca; o modelo
        # começa depois do último deles.
        assert N.extrair_marca_modelo("VW VOLKSWAGEN AMAROK HIGHLINE 3.0TDI") == (
            "VOLKSWAGEN", "AMAROK",
        )
        assert N.extrair_marca_modelo("MERCEDES-BENZ C 180 EXCLUSIVE 1.6T") == (
            "MERCEDES-BENZ", "C 180",
        )


class TestTipoAnunciante:
    """Dois sinais independentes da ficha: logo do bloco `#anunciante` e
    bucket da foto principal. Nada mais conta — em especial não conta varrer
    o HTML inteiro, que pega a vitrine lateral de outros anúncios."""

    def test_ficha_real_de_particular(self, adapter):
        html = (FIXTURES / "shopcar_anuncio.html").read_text(encoding="utf-8")
        bruto = adapter.parse_anuncio(html, URL_PARTICULAR)
        assert bruto.vendedor_tipo == "particular"
        assert bruto.vendedor_nome == "Patrick de Souza Barbosa"

    def test_ficha_real_de_loja(self, adapter):
        html = (FIXTURES / "shopcar_anuncio_loja.html").read_text(encoding="utf-8")
        bruto = adapter.parse_anuncio(html, URL_LOJA)
        assert bruto.vendedor_tipo == "loja"
        assert bruto.vendedor_nome == "Nação Chevrolet"

    def test_vitrine_lateral_nao_transforma_loja_em_particular(self, adapter):
        """Regressão: a ficha de loja tem "Ofertas da categoria" com fotos de
        outros anúncios. Procurar `/particular/` no HTML inteiro marcava esse
        anúncio de loja como particular — foi o que misturou os dois."""
        html = (FIXTURES / "shopcar_anuncio_loja.html").read_text(encoding="utf-8")
        assert "mais-ofertas" in html
        bruto = adapter.parse_anuncio(html, URL_LOJA)
        assert bruto.vendedor_tipo == "loja"

    def test_jsonld_organization_shopcar_nao_e_loja(self, adapter):
        html = """
        <html><head><script type="application/ld+json">
        {"@type": "Product", "name": "Corolla",
         "offers": {"price": "100000.00",
                    "seller": {"@type": "Organization", "name": "Shopcar"}}}
        </script></head><body><h1>Corolla</h1>
        <div id="anunciante"><span class="logomarca">
          <img alt="Anunciante particular" src="https://cdn.shopcar.com.br/images/anunciante_particular.png">
        </span><span class="nome">Maria</span></div>
        </body></html>
        """
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_tipo == "particular"
        assert bruto.vendedor_nome == "Maria"

    def test_jsonld_seller_organization_nao_decide_mais(self, adapter):
        """Antes bastava um `seller.@type` para chamar de loja. O Shopcar
        publica isso de forma inconsistente, então deixou de valer."""
        html = """
        <html><head><script type="application/ld+json">
        {"@type": "Vehicle", "name": "Corolla",
         "offers": {"@type": "Offer", "price": "100000.00",
                    "seller": {"@type": "Organization", "name": "Revenda ABC"}}}
        </script></head><body><h1>Corolla</h1></body></html>
        """
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_tipo is None

    def test_foto_principal_em_particular_e_particular(self, adapter):
        html = """
        <html><head>
        <meta property="og:image" content="https://cdn.shopcar.com.br/stored/veiculos/particular/1.jpg">
        </head><body><h1>Corolla</h1></body></html>
        """
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_tipo == "particular"

    def test_foto_principal_sem_particular_nao_e_loja(self, adapter):
        """Path `/stored/veiculos/` (sem particular) é compartilhado. Não decide."""
        html = """
        <html><head>
        <meta property="og:image" content="https://cdn.shopcar.com.br/stored/veiculos/9.jpg">
        </head><body><h1>Corolla</h1></body></html>
        """
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_tipo is None

    def test_logo_de_loja_no_anunciante_e_loja(self, adapter):
        html = """
        <html><body><h1>Corolla</h1>
        <div id="anunciante"><span class="logomarca">
          <img alt="Nação Chevrolet" src="https://cdn.shopcar.com.br/stored/lojas/logo.png">
        </span><span class="nome">Nação Chevrolet</span></div>
        </body></html>
        """
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_tipo == "loja"
        assert bruto.vendedor_nome == "Nação Chevrolet"

    def test_sinais_discordantes_ficam_none(self, adapter):
        """Logo de loja com foto de particular é anomalia. Chutar um dos dois
        é pior do que mandar para revisão."""
        html = """
        <html><head>
        <meta property="og:image" content="https://cdn.shopcar.com.br/stored/veiculos/particular/1.jpg">
        </head><body><h1>Corolla</h1>
        <div id="anunciante"><span class="logomarca">
          <img alt="Revenda" src="https://cdn.shopcar.com.br/stored/lojas/logo.png">
        </span><span class="nome">Revenda</span></div>
        </body></html>
        """
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_tipo is None
        assert bruto.vendedor_nome == "Revenda"

    def test_sem_qualquer_sinal_fica_none(self, adapter):
        html = "<html><body><h1>Corolla</h1></body></html>"
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_tipo is None

    def test_tipo_anunciante_chega_ate_o_veiculo_normalizado(self, adapter):
        html = (FIXTURES / "shopcar_anuncio_loja.html").read_text(encoding="utf-8")
        v = normalizar(adapter.parse_anuncio(html, URL_LOJA))
        assert v.tipo_anunciante == "loja"


class TestContentHash:
    def _bruto(self, **kw):
        base = dict(fonte="f", id_externo="1", url="u", titulo="Corolla",
                    preco_texto="R$ 100.000", km_texto="10.000 km")
        base.update(kw)
        return AnuncioBruto(**base)

    def test_estavel_para_o_mesmo_conteudo(self):
        assert self._bruto().content_hash() == self._bruto().content_hash()

    def test_muda_quando_o_preco_muda(self):
        a = self._bruto().content_hash()
        b = self._bruto(preco_texto="R$ 95.000").content_hash()
        assert a != b

    def test_ordem_das_fotos_nao_afeta(self):
        a = self._bruto(fotos=["1.jpg", "2.jpg"]).content_hash()
        b = self._bruto(fotos=["2.jpg", "1.jpg"]).content_hash()
        assert a == b


class TestFingerprint:
    def _v(self, **kw):
        bruto = AnuncioBruto(
            fonte=kw.pop("fonte", "a"), id_externo="1", url="u",
            titulo=kw.pop("titulo", "TOYOTA COROLLA XEI 2020"),
            preco_texto=kw.pop("preco", "R$ 100.000"),
            km_texto=kw.pop("km", "45.000 km"),
            cor_texto="PRATA", cidade_texto="Campo Grande - MS",
        )
        return normalizar(bruto)

    def test_mesmo_carro_em_fontes_diferentes_casa(self):
        a = self._v(fonte="shopcar", km="45.000 km", preco="R$ 100.000")
        b = self._v(fonte="olx", km="45.320 km", preco="R$ 103.000")
        assert fingerprint(a) == fingerprint(b)

    def test_carros_diferentes_nao_casam(self):
        a = self._v(titulo="TOYOTA COROLLA XEI 2020")
        b = self._v(titulo="TOYOTA COROLLA XEI 2021")
        assert fingerprint(a) != fingerprint(b)

    def test_preco_nao_entra_no_fingerprint(self):
        a = self._v(preco="R$ 100.000")
        b = self._v(preco="R$ 80.000")
        assert fingerprint(a) == fingerprint(b)


def _html_anuncio(preco_mil: int, tipo: str = "particular") -> str:
    if tipo == "particular":
        foto = "https://cdn.shopcar.com.br/stored/veiculos/particular/1.jpg"
        anunciante = (
            '<div id="anunciante"><span class="logomarca">'
            '<img alt="Anunciante particular" '
            'src="https://www.shopcar.com.br/images/anunciante_particular.png">'
            '</span><span class="nome">Maria</span></div>'
        )
    else:
        foto = "https://cdn.shopcar.com.br/stored/veiculos/1.jpg"
        anunciante = (
            '<div id="anunciante"><span class="logomarca">'
            '<img alt="Revenda" src="https://cdn.shopcar.com.br/stored/lojas/logo.png">'
            '</span><span class="nome">Revenda</span></div>'
        )
    return f"""<html><head>
      <meta property="og:image" content="{foto}">
      <script type="application/ld+json">
      {{"@type":"Product",
        "name":"TOYOTA - Picape Média - Hilux SRV 2.8TDi 16v 4x4 C.D.",
        "offers":{{"price":"{preco_mil}000.00"}},
        "mileageFromOdometer":{{"value":50000,"unitCode":"KMT"}},
        "modelDate":"2022","color":"Prata"}}
      </script></head><body><h1>Hilux</h1>{anunciante}</body></html>"""


class RunnerFake:
    """Listagem controlada em memória: `precos` é o que a busca mostra agora
    (id -> preço em milhares), `tipos` o que cada ficha declara."""

    def __init__(self, precos: dict[str, int], tipos: dict[str, str] | None = None):
        self.precos = dict(precos)
        self.tipos = dict(tipos or {})
        self.storage = MemoryStorage()
        self.fichas_abertas: list[str] = []
        self.listagem_falha = False

        cfg = replace(FONTES["shopcar"], usar_sitemap=False, req_interval_ms=1000, jitter_ms=0)
        pai = self

        class AdapterFake(ShopcarAdapter):
            def urls_de_listagem(self, tipo_anunciante=None):
                yield "https://x.test/lista"

            def cards_de_listagem(self, html_listagem, base_url):
                return [
                    CardListagem(
                        url=f"https://x.test/veiculo/{ident}",
                        id_externo=ident,
                        preco_texto=f"R$ {preco}.000,00",
                    )
                    for ident, preco in pai.precos.items()
                ]

            def proxima_pagina(self, html_listagem, base_url):
                return None

        def handler(request):
            if request.url.path == "/robots.txt":
                return httpx.Response(200, text="User-agent: *\nAllow: /\n")
            if request.url.path == "/lista":
                if pai.listagem_falha:
                    return httpx.Response(503, text="indisponível")
                return httpx.Response(200, text="<html><body>listagem</body></html>")
            ident = request.url.path.rsplit("/", 1)[-1]
            if ident not in pai.precos:
                return httpx.Response(404, text="fora do ar")
            pai.fichas_abertas.append(ident)
            return httpx.Response(
                200, text=_html_anuncio(pai.precos[ident], pai.tipos.get(ident, "particular"))
            )

        client = PoliteClient(
            cfg, transport=httpx.MockTransport(handler), sleep=lambda s: None, clock=lambda: 0.0
        )
        self.runner = Runner(AdapterFake(cfg), client, self.storage)

    def coletar(self, **kw):
        self.fichas_abertas = []
        return self.runner.coletar(**kw)


class TestRunnerIncremental:
    """Preço no card da listagem é o que decide abrir ficha. Sem isso, uma
    revarredura das 1546 do Shopcar custaria 1546 requisições por dia."""

    def test_primeira_passada_salva_tudo(self):
        fake = RunnerFake({"1001": 100, "1002": 200, "1003": 300})
        res = fake.coletar()
        assert res.novos == 3
        assert res.anuncios_no_ar == 3
        assert len(fake.fichas_abertas) == 3

    def test_segunda_passada_sem_mudanca_nao_abre_ficha(self):
        fake = RunnerFake({"1001": 100, "1002": 200, "1003": 300})
        fake.coletar()

        res = fake.coletar()
        assert fake.fichas_abertas == []
        assert res.inalterados == 3
        assert res.novos == 0 and res.atualizados == 0
        assert res.requisicoes == 1  # só a página de listagem

    def test_preco_mudou_na_listagem_reabre_e_conta(self):
        fake = RunnerFake({"1001": 100, "1002": 200})
        fake.coletar()

        fake.precos["1001"] = 95
        res = fake.coletar()
        assert fake.fichas_abertas == ["1001"]
        assert res.atualizados == 1
        assert res.precos_alterados == 1
        assert res.inalterados == 1

    def test_anuncio_fora_da_listagem_e_desativado_sem_delete(self):
        fake = RunnerFake({"1001": 100, "1002": 200, "1003": 300})
        fake.coletar()
        assert len(fake.storage.anuncios) == 3

        del fake.precos["1002"]
        res = fake.coletar()

        assert res.desativados == 1
        assert res.anuncios_no_ar == 2
        # Registro continua: histórico de preço não pode evaporar.
        assert len(fake.storage.anuncios) == 3
        fora = fake.storage.anuncios[("shopcar", "https://x.test/veiculo/1002")]
        assert fora["ativo"] is False

    def test_anuncio_que_volta_ao_ar_reativa(self):
        fake = RunnerFake({"1001": 100, "1002": 200})
        fake.coletar()
        del fake.precos["1002"]
        fake.coletar()

        fake.precos["1002"] = 200
        res = fake.coletar()
        assert res.desativados == 0
        assert fake.storage.anuncios[("shopcar", "https://x.test/veiculo/1002")]["ativo"] is True

    def test_limite_corta_fichas_mas_nao_a_varredura(self):
        """Quem diz "está no ar" é a listagem, que foi lida inteira. O limite
        corta só quantas fichas abrimos — então o que saiu do ar sai da fila
        mesmo numa coleta limitada."""
        fake = RunnerFake({"1001": 100, "1002": 200, "1003": 300})
        fake.coletar()

        fake.precos["1001"] = 95
        fake.precos["1002"] = 190
        del fake.precos["1003"]
        res = fake.coletar(limite=1)

        assert res.encerrado_por == "limite"
        assert res.atualizados == 1
        assert res.desativados == 1
        assert fake.storage.anuncios[("shopcar", "https://x.test/veiculo/1003")]["ativo"] is False

    def test_enumeracao_incompleta_nao_desativa_ninguem(self):
        """Erro na listagem deixa a lista de "no ar" furada. Desativar aí
        apagaria da fila anúncio que existe."""
        fake = RunnerFake({"1001": 100, "1002": 200})
        fake.coletar()

        fake.listagem_falha = True
        res = fake.coletar()
        assert res.desativados == 0
        assert fake.storage.anuncios[("shopcar", "https://x.test/veiculo/1002")]["ativo"] is True

    def test_revisita_reabre_ficha_de_anuncio_parado(self):
        fake = RunnerFake({"1001": 100})
        fake.coletar()

        registro = fake.storage.anuncios[("shopcar", "https://x.test/veiculo/1001")]
        registro["ultima_vista_em"] = datetime.now(timezone.utc) - timedelta(days=30)

        fake.coletar()
        assert fake.fichas_abertas == ["1001"]

    def test_fonte_inativa_nao_faz_requisicao(self):
        cfg = replace(FONTES["shopcar"], ativa=False)
        client = PoliteClient(
            cfg,
            transport=httpx.MockTransport(lambda r: httpx.Response(200, text="x")),
            sleep=lambda s: None,
        )
        runner = Runner(ShopcarAdapter(cfg), client, MemoryStorage())
        res = runner.coletar()
        assert res.requisicoes == 0
        assert res.encerrado_por == "fonte inativa"


class TestRunnerFiltroTipoAnunciante:
    """A listagem filtrada do Shopcar é a autoridade; a ficha é a segunda
    opinião. Quem discorda não entra."""

    def test_ficha_que_contradiz_o_filtro_e_ignorada(self):
        fake = RunnerFake(
            {"1001": 100, "1002": 200, "1003": 300},
            tipos={"1001": "particular", "1002": "loja", "1003": "particular"},
        )
        res = fake.coletar(tipo_anunciante="particular")

        assert res.novos == 2
        assert res.ignorados_filtro == 1
        assert len(fake.storage.anuncios) == 2
        assert all(
            reg["veiculo"].tipo_anunciante == "particular"
            for reg in fake.storage.anuncios.values()
        )

    def test_ficha_sem_sinal_herda_o_filtro_da_listagem(self):
        """Sem sinal na ficha, quem separou foi o próprio site: o anúncio veio
        de `tipoanuncio=2`, então é particular."""
        fake = RunnerFake({"1001": 100})
        fake.runner.adapter.parse_anuncio = lambda html, url: _sem_tipo(
            ShopcarAdapter(fake.runner.cfg).parse_anuncio(html, url)
        )
        res = fake.coletar(tipo_anunciante="particular")

        assert res.novos == 1
        veiculo = next(iter(fake.storage.anuncios.values()))["veiculo"]
        assert veiculo.tipo_anunciante == "particular"

    def test_sem_filtro_salva_os_dois_tipos(self):
        fake = RunnerFake(
            {"1001": 100, "1002": 200}, tipos={"1001": "particular", "1002": "loja"}
        )
        res = fake.coletar()
        assert res.novos == 2
        assert res.ignorados_filtro == 0

    def test_varredura_de_particular_nao_desativa_loja(self):
        fake = RunnerFake({"1001": 100, "1002": 200}, tipos={"1002": "loja"})
        fake.coletar()

        # Passa a rodar só particular: o anúncio de loja não está nessa
        # listagem, mas continuar no ar não é problema dele.
        del fake.precos["1002"]
        res = fake.coletar(tipo_anunciante="particular")

        assert res.desativados == 0
        assert fake.storage.anuncios[("shopcar", "https://x.test/veiculo/1002")]["ativo"] is True


def _sem_tipo(bruto):
    if bruto is not None:
        bruto.vendedor_tipo = None
    return bruto


class TestFontesConfiguradas:
    def test_olx_e_webmotors_nascem_desligadas(self):
        assert FONTES["olx"].ativa is False
        assert FONTES["webmotors"].ativa is False

    def test_olx_e_manual(self):
        assert FONTES["olx"].nivel_acesso == "manual"

    def test_toda_fonte_declara_base_legal(self):
        for nome, cfg in FONTES.items():
            assert cfg.base_legal.strip(), nome

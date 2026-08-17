from pathlib import Path

import httpx
import pytest

from captacao_bot.adapters.shopcar import ShopcarAdapter
from captacao_bot.config import FONTES
from captacao_bot.http_client import PoliteClient
from captacao_bot.models import AnuncioBruto
from captacao_bot.pipeline import fingerprint, normalizar, precisa_revisao
from captacao_bot.runner import Runner
from captacao_bot.storage import MemoryStorage

FIXTURES = Path(__file__).parent / "fixtures"


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


class TestTipoAnunciante:
    """particular vs loja — sinal primário é offers.seller.@type do JSON-LD
    (schema.org Organization/Person), fallback é qual seletor CSS casa."""

    def test_jsonld_seller_organization_e_loja(self, adapter):
        html = """
        <html><head><script type="application/ld+json">
        {"@type": "Vehicle", "name": "Corolla",
         "offers": {"@type": "Offer", "price": "100000.00",
                    "seller": {"@type": "Organization", "name": "Revenda ABC"}}}
        </script></head><body><h1>Corolla</h1></body></html>
        """
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_tipo == "loja"
        assert bruto.vendedor_nome == "Revenda ABC"

    def test_jsonld_seller_person_e_particular(self, adapter):
        html = """
        <html><head><script type="application/ld+json">
        {"@type": "Vehicle", "name": "Corolla",
         "offers": {"@type": "Offer", "price": "100000.00",
                    "seller": {"@type": "Person", "name": "João Silva"}}}
        </script></head><body><h1>Corolla</h1></body></html>
        """
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_tipo == "particular"
        assert bruto.vendedor_nome == "João Silva"

    def test_fallback_css_loja_nome(self, adapter):
        html = """
        <html><body><h1>Corolla</h1><div class="loja-nome">Revenda XPTO</div></body></html>
        """
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_tipo == "loja"
        assert bruto.vendedor_nome == "Revenda XPTO"

    def test_fallback_css_vendedor_nome_e_particular(self, adapter):
        html = """
        <html><body><h1>Corolla</h1><div class="vendedor-nome">Maria Souza</div></body></html>
        """
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_tipo == "particular"
        assert bruto.vendedor_nome == "Maria Souza"

    def test_sem_qualquer_sinal_fica_none(self, adapter):
        html = "<html><body><h1>Corolla</h1></body></html>"
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        assert bruto.vendedor_tipo is None

    def test_tipo_anunciante_chega_ate_o_veiculo_normalizado(self, adapter):
        html = """
        <html><body><h1>Corolla</h1><div class="loja-nome">Revenda XPTO</div></body></html>
        """
        bruto = adapter.parse_anuncio(html, "https://x.test/veiculo/1")
        v = normalizar(bruto)
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


class TestRunnerEarlyStop:
    """O early stop é o que impede a coleta de varrer o site inteiro todo dia."""

    def _montar(self, n_urls, early_stop_n, html):
        from dataclasses import replace
        cfg = replace(FONTES["shopcar"], early_stop_n=early_stop_n,
                      usar_sitemap=False, req_interval_ms=1000, jitter_ms=0)

        class AdapterFake(ShopcarAdapter):
            def urls_de_listagem(self):
                yield "https://x.test/lista"

            def urls_de_anuncio(self, html_listagem, base_url):
                return [f"https://x.test/veiculo/{i}" for i in range(n_urls)]

            def proxima_pagina(self, html_listagem, base_url):
                return None

        def handler(request):
            if request.url.path == "/robots.txt":
                return httpx.Response(200, text="User-agent: *\nAllow: /\n")
            return httpx.Response(200, text=html)

        client = PoliteClient(cfg, transport=httpx.MockTransport(handler),
                              sleep=lambda s: None, clock=lambda: 0.0)
        return Runner(AdapterFake(cfg), client, MemoryStorage())

    def test_para_apos_n_conhecidos_seguidos(self):
        html = (FIXTURES / "anuncio_com_jsonld.html").read_text(encoding="utf-8")
        runner = self._montar(n_urls=100, early_stop_n=5, html=html)

        primeira = runner.coletar()
        assert primeira.novos == 100

        # Segunda passada: nada mudou, deve parar cedo.
        segunda = runner.coletar()
        assert segunda.inalterados == 5
        assert "early stop" in segunda.encerrado_por
        assert segunda.requisicoes < 10  # 1 listagem + 5 anúncios

    def test_fonte_inativa_nao_faz_requisicao(self):
        from dataclasses import replace
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
    """Pedido "só loja" ou "só particular" (botão da tela Fontes) filtra o
    que é salvo — só dá pra saber o tipo depois de parsear o anúncio."""

    def _montar(self, tipos, html_por_tipo):
        from dataclasses import replace

        cfg = replace(FONTES["shopcar"], usar_sitemap=False, req_interval_ms=1000, jitter_ms=0)
        urls = [f"https://x.test/veiculo/{i}" for i in range(len(tipos))]
        tipo_por_url = dict(zip(urls, tipos))

        class AdapterFake(ShopcarAdapter):
            def urls_de_listagem(self):
                yield "https://x.test/lista"

            def urls_de_anuncio(self, html_listagem, base_url):
                return urls

            def proxima_pagina(self, html_listagem, base_url):
                return None

            def parse_anuncio(self, html, url):
                bruto = super().parse_anuncio(html, url)
                if bruto is not None:
                    bruto.vendedor_tipo = tipo_por_url[url]
                return bruto

        def handler(request):
            if request.url.path == "/robots.txt":
                return httpx.Response(200, text="User-agent: *\nAllow: /\n")
            path = request.url.path
            tipo = tipo_por_url.get(f"https://x.test{path}")
            return httpx.Response(200, text=html_por_tipo[tipo] if tipo else "erro")

        client = PoliteClient(cfg, transport=httpx.MockTransport(handler),
                              sleep=lambda s: None, clock=lambda: 0.0)
        return Runner(AdapterFake(cfg), client, MemoryStorage())

    def _html_generico(self, titulo):
        return f"<html><body><h1>{titulo}</h1></body></html>"

    def test_so_loja_ignora_particular(self):
        html_por_tipo = {
            "loja": self._html_generico("Corolla Loja"),
            "particular": self._html_generico("Corolla Particular"),
        }
        runner = self._montar(["loja", "particular", "loja"], html_por_tipo)
        res = runner.coletar(tipo_anunciante="loja")

        assert res.novos == 2
        assert res.ignorados_filtro == 1
        assert len(runner.storage.anuncios) == 2

    def test_sem_filtro_salva_os_dois_tipos(self):
        html_por_tipo = {
            "loja": self._html_generico("Corolla Loja"),
            "particular": self._html_generico("Corolla Particular"),
        }
        runner = self._montar(["loja", "particular"], html_por_tipo)
        res = runner.coletar()

        assert res.novos == 2
        assert res.ignorados_filtro == 0


class TestFontesConfiguradas:
    def test_olx_e_webmotors_nascem_desligadas(self):
        assert FONTES["olx"].ativa is False
        assert FONTES["webmotors"].ativa is False

    def test_olx_e_manual(self):
        assert FONTES["olx"].nivel_acesso == "manual"

    def test_toda_fonte_declara_base_legal(self):
        for nome, cfg in FONTES.items():
            assert cfg.base_legal.strip(), nome

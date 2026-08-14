import pytest

from captacao_bot import normalize as N


class TestLimparTitulo:
    def test_remove_ruido_comercial(self):
        titulo = "GOL 1.0 FLEX COMPLETÃO 15/16 IPVA PAGO!!! ÚNICO DONO"
        limpo = N.limpar_titulo(titulo)
        assert "IPVA" not in limpo
        assert "COMPLET" not in limpo
        assert "DONO" not in limpo
        assert "GOL" in limpo and "15/16" in limpo

    def test_remove_acento_e_pontuacao(self):
        assert N.limpar_titulo("Citroën C3 ★ Oportunidade!!!") == "CITROEN C3"


class TestPreco:
    @pytest.mark.parametrize("texto,esperado", [
        ("R$ 104.900,00", 10_490_000),
        ("R$ 42.900", 4_290_000),
        ("104900.00", 10_490_000),
        ("R$ 1.234.567,89", 123_456_789),
    ])
    def test_extrai(self, texto, esperado):
        assert N.extrair_preco(texto) == esperado

    @pytest.mark.parametrize("texto", [
        None, "", "Sob consulta", "48x de R$ 1.299", "entrada de R$ 15.000",
        "R$ 12",  # abaixo da faixa plausível
    ])
    def test_recusa_lixo(self, texto):
        assert N.extrair_preco(texto) is None


class TestKm:
    @pytest.mark.parametrize("texto,esperado", [
        ("68.450 km", 68450),
        ("Km: 112.300", 112300),
        ("112300 KM", 112300),
        ("0 km", 0),
    ])
    def test_extrai(self, texto, esperado):
        assert N.extrair_km(texto) == esperado

    def test_recusa_absurdo(self):
        assert N.extrair_km("9.999.999 km") is None

    def test_sem_km_devolve_none(self):
        assert N.extrair_km("Automático") is None


class TestAnos:
    @pytest.mark.parametrize("texto,fab,mod", [
        ("2019/2020", 2019, 2020),
        ("15/16", 2015, 2016),
        ("2015/2015", 2015, 2015),
        ("2022", 2022, 2022),
    ])
    def test_extrai(self, texto, fab, mod):
        assert N.extrair_anos(texto) == (fab, mod)

    def test_par_impossivel_cai_para_ano_solto(self):
        # 2015/2019 não é fab/mod válido; sobra o primeiro ano plausível.
        fab, mod = N.extrair_anos("2015/2019")
        assert fab == 2015 and mod == 2015

    def test_sem_ano(self):
        assert N.extrair_anos("Corolla XEi") == (None, None)


class TestMarcaModelo:
    @pytest.mark.parametrize("titulo,marca,modelo", [
        ("TOYOTA COROLLA XEI 2.0", "TOYOTA", "COROLLA"),
        ("COROLLA CROSS XRE 2022", "TOYOTA", "COROLLA CROSS"),
        ("GOL 1.0 FLEX", "VOLKSWAGEN", "GOL"),          # marca inferida do modelo
        ("VW T-CROSS COMFORTLINE", "VOLKSWAGEN", "T-CROSS"),
        ("JEEP COMPASS LONGITUDE", "JEEP", "COMPASS"),
    ])
    def test_extrai(self, titulo, marca, modelo):
        assert N.extrair_marca_modelo(N.limpar_titulo(titulo)) == (marca, modelo)

    def test_desconhecido_nao_inventa(self):
        marca, modelo = N.extrair_marca_modelo("VEICULO SEMINOVO OPORTUNIDADE")
        assert marca is None and modelo is None


class TestCambioCombustivel:
    def test_cambio(self):
        assert N.extrair_cambio("2.0 Automático") == "AUTOMATICO"
        assert N.extrair_cambio("1.0 Manual") == "MANUAL"
        assert N.extrair_cambio("CVT") == "AUTOMATICO"

    def test_combustivel(self):
        assert N.extrair_combustivel("1.0 Flex") == "FLEX"
        assert N.extrair_combustivel("2.8 Diesel 4x4") == "DIESEL"
        assert N.extrair_combustivel("Corolla XEi") is None


class TestCidadeUf:
    @pytest.mark.parametrize("texto,cidade,uf", [
        ("Campo Grande - MS", "Campo Grande", "MS"),
        ("Dourados, MS", "Dourados", "MS"),
        ("São Paulo/SP", "São Paulo", "SP"),
    ])
    def test_extrai(self, texto, cidade, uf):
        assert N.extrair_cidade_uf(texto) == (cidade, uf)

    def test_sufixo_que_nao_e_uf(self):
        cidade, uf = N.extrair_cidade_uf("Rio Verde de Mato Grosso")
        assert uf is None and cidade.startswith("Rio Verde")

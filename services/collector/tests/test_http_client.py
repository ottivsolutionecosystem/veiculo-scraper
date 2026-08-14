"""Testes do PoliteClient — rodam offline, com transporte simulado.

Nenhum teste deste projeto toca a internet. Teste que depende de rede é teste
que falha na sexta-feira e ninguém sabe por quê.
"""

import httpx
import pytest

from captacao_bot.config import AdapterConfig, CircuitBreakerConfig
from captacao_bot.http_client import (
    BloqueadoPorRobots,
    FontePausada,
    ForaDaJanela,
    PoliteClient,
    dentro_da_janela,
)


ROBOTS_LIBERADO = "User-agent: *\nAllow: /\n"
ROBOTS_BLOQUEADO = "User-agent: *\nDisallow: /veiculo/\n"
ROBOTS_COM_DELAY = "User-agent: *\nAllow: /\nCrawl-delay: 10\n"


def cfg(**kw) -> AdapterConfig:
    base = dict(
        fonte="teste",
        nivel_acesso="publico_educado",
        base_legal="robots.txt permite",
        base_url="https://exemplo.test",
        req_interval_ms=1000,
        jitter_ms=0,
    )
    base.update(kw)
    return AdapterConfig(**base)


class Relogio:
    """Relógio e sleep falsos: o teste roda instantâneo, mas as esperas são
    medidas de verdade."""

    def __init__(self) -> None:
        self.agora = 0.0
        self.esperas: list[float] = []

    def sleep(self, segundos: float) -> None:
        self.esperas.append(segundos)
        self.agora += segundos

    def monotonic(self) -> float:
        return self.agora


def cliente(handler, config=None, relogio=None) -> PoliteClient:
    relogio = relogio or Relogio()
    return PoliteClient(
        config or cfg(),
        transport=httpx.MockTransport(handler),
        sleep=relogio.sleep,
        clock=relogio.monotonic,
    )


def handler_simples(robots=ROBOTS_LIBERADO, corpo="<html>ok</html>", status=200,
                    headers=None):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text=robots)
        return httpx.Response(status, text=corpo, headers=headers or {})
    return handler


class TestRobots:
    def test_respeita_disallow(self):
        c = cliente(handler_simples(robots=ROBOTS_BLOQUEADO))
        with pytest.raises(BloqueadoPorRobots):
            c.get("https://exemplo.test/veiculo/123")

    def test_permite_quando_liberado(self):
        c = cliente(handler_simples())
        assert c.get("https://exemplo.test/veiculo/123").status == 200

    def test_crawl_delay_maior_que_o_nosso_prevalece(self):
        c = cliente(handler_simples(robots=ROBOTS_COM_DELAY), cfg(req_interval_ms=1000))
        c.get("https://exemplo.test/a")
        assert c._intervalo_ms() == 10_000

    def test_robots_ausente_nao_derruba_a_coleta(self):
        def handler(request):
            if request.url.path == "/robots.txt":
                return httpx.Response(404)
            return httpx.Response(200, text="ok")
        c = cliente(handler)
        assert c.get("https://exemplo.test/a").status == 200


class TestRitmo:
    def test_espera_entre_requisicoes(self):
        relogio = Relogio()
        c = cliente(handler_simples(), cfg(req_interval_ms=3000), relogio)
        c.get("https://exemplo.test/a")
        c.get("https://exemplo.test/b")
        # a segunda requisição esperou ~3s
        assert any(e >= 2.9 for e in relogio.esperas)

    def test_uma_conexao_por_host(self):
        # O contrato está na config: concorrência 1, não negociável.
        c = cliente(handler_simples())
        assert c.cfg.max_concurrency == 1


class TestConditionalGet:
    def test_envia_validadores(self):
        capturado = {}

        def handler(request):
            if request.url.path == "/robots.txt":
                return httpx.Response(200, text=ROBOTS_LIBERADO)
            capturado.update(request.headers)
            return httpx.Response(304)

        c = cliente(handler)
        r = c.get("https://exemplo.test/a", etag='W/"abc"', last_modified="Mon, 01 Jan 2024 00:00:00 GMT")
        assert capturado["if-none-match"] == 'W/"abc"'
        assert capturado["if-modified-since"].startswith("Mon, 01 Jan")
        assert r.nao_modificado and r.ok

    def test_guarda_etag_da_resposta(self):
        c = cliente(handler_simples(headers={"ETag": 'W/"xyz"'}))
        assert c.get("https://exemplo.test/a").etag == 'W/"xyz"'


class TestCircuitBreaker:
    def test_abre_apos_falhas_seguidas(self):
        c = cliente(
            handler_simples(status=429),
            cfg(circuit_breaker=CircuitBreakerConfig(falhas_para_pausar=3, pausa_horas=6,
                                                     pausas_para_desativar=3)),
        )
        with pytest.raises(FontePausada):
            c.get("https://exemplo.test/a")
        assert c.circuito.pausado_ate is not None

    def test_sucesso_zera_o_contador(self):
        respostas = [429, 429, 200]

        def handler(request):
            if request.url.path == "/robots.txt":
                return httpx.Response(200, text=ROBOTS_LIBERADO)
            return httpx.Response(respostas.pop(0), text="ok")

        c = cliente(handler)
        c.get("https://exemplo.test/a")
        assert c.circuito.falhas_seguidas == 0
        assert c.circuito.pausado_ate is None

    def test_desativa_apos_pausas_repetidas(self):
        c = cliente(
            handler_simples(status=403),
            cfg(circuit_breaker=CircuitBreakerConfig(falhas_para_pausar=1, pausa_horas=0,
                                                     pausas_para_desativar=2)),
        )
        for _ in range(2):
            try:
                c.get("https://exemplo.test/a")
            except FontePausada:
                c.circuito.pausado_ate = None  # simula fim da pausa
        assert c.circuito.desativado is True

    def test_404_nao_conta_como_bloqueio(self):
        c = cliente(handler_simples(status=404))
        r = c.get("https://exemplo.test/a")
        assert r.status == 404
        assert c.circuito.falhas_seguidas == 0


class TestJanela:
    @pytest.mark.parametrize("janela,hora,esperado", [
        ("01:00-06:00", 3, True),
        ("01:00-06:00", 9, False),
        ("22:00-04:00", 23, True),   # cruza a meia-noite
        ("22:00-04:00", 2, True),
        ("22:00-04:00", 12, False),
        (None, 15, True),
    ])
    def test_dentro_da_janela(self, janela, hora, esperado):
        from datetime import datetime
        agora = datetime(2026, 1, 1, hora, 30)
        assert dentro_da_janela(janela, agora) is esperado

    def test_recusa_fora_da_janela(self):
        c = cliente(handler_simples(), cfg(janela_coleta="01:00-01:01"))
        from datetime import datetime
        import captacao_bot.http_client as mod
        original = mod.dentro_da_janela
        mod.dentro_da_janela = lambda j, a=None: False
        try:
            with pytest.raises(ForaDaJanela):
                c.get("https://exemplo.test/a")
        finally:
            mod.dentro_da_janela = original


class TestUserAgent:
    def test_identifica_o_bot(self):
        from captacao_bot.config import USER_AGENT
        assert "+http" in USER_AGENT and "@" in USER_AGENT


class TestConfig:
    def test_exige_base_legal(self):
        with pytest.raises(ValueError, match="base_legal"):
            cfg(base_legal="   ")

    def test_concorrencia_e_fixa(self):
        with pytest.raises(ValueError, match="max_concurrency"):
            cfg(max_concurrency=4)

    def test_intervalo_minimo(self):
        with pytest.raises(ValueError, match="req_interval_ms"):
            cfg(req_interval_ms=200)

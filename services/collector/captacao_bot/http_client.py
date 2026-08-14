"""Cliente HTTP educado.

Regras implementadas aqui, todas obrigatórias para qualquer adapter:

- User-Agent identificável, com URL e e-mail de contato.
- Uma requisição por vez por host, intervalo mínimo + jitter aleatório.
- robots.txt lido, obedecido e cacheado; Crawl-delay respeitado quando maior
  que o intervalo configurado.
- Conditional GET (ETag / Last-Modified). 304 é a resposta mais barata que
  existe para os dois lados.
- Retry no máximo `max_retries`, backoff exponencial, sem retry storm.
- Circuit breaker: sequência de 403/429/503 pausa a fonte. Nunca insistir.

O que este módulo deliberadamente NÃO faz: rotação de IP/proxy para escapar de
bloqueio, falsificação de fingerprint de navegador ou TLS, resolução de captcha.
Bloqueio persistente é tratado pela escada de escalonamento (README), não por
contorno técnico.
"""

from __future__ import annotations

import logging
import random
import time
import urllib.robotparser
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin, urlparse

import httpx

from .config import USER_AGENT, AdapterConfig

log = logging.getLogger(__name__)

STATUS_BLOQUEIO = {401, 403, 429, 503}


class FontePausada(RuntimeError):
    """Circuit breaker aberto: a fonte está em pausa."""


class BloqueadoPorRobots(RuntimeError):
    """robots.txt não permite este caminho para o nosso User-Agent."""


class ForaDaJanela(RuntimeError):
    """Fora da janela de coleta configurada."""


@dataclass
class Resposta:
    url: str
    status: int
    html: str | None
    etag: str | None
    last_modified: str | None
    nao_modificado: bool  # True quando veio 304

    @property
    def ok(self) -> bool:
        return self.status == 200 or self.nao_modificado


@dataclass
class EstadoCircuito:
    falhas_seguidas: int = 0
    pausado_ate: datetime | None = None
    pausas_na_janela: list[datetime] = field(default_factory=list)
    desativado: bool = False
    motivo: str | None = None


def _agora() -> datetime:
    return datetime.now(timezone.utc)


def dentro_da_janela(janela: str | None, agora: datetime | None = None) -> bool:
    """`janela` no formato "01:00-06:00" (hora local do servidor). None = sempre."""
    if not janela:
        return True
    inicio_s, fim_s = janela.split("-")
    agora = agora or datetime.now()
    hi, mi = (int(x) for x in inicio_s.split(":"))
    hf, mf = (int(x) for x in fim_s.split(":"))
    minuto_atual = agora.hour * 60 + agora.minute
    inicio, fim = hi * 60 + mi, hf * 60 + mf
    if inicio <= fim:
        return inicio <= minuto_atual < fim
    return minuto_atual >= inicio or minuto_atual < fim  # janela que cruza a meia-noite


class PoliteClient:
    """Um cliente por fonte. Não compartilhar entre fontes."""

    def __init__(
        self,
        cfg: AdapterConfig,
        transport: httpx.BaseTransport | None = None,
        sleep=time.sleep,
        clock=time.monotonic,
    ) -> None:
        self.cfg = cfg
        self._sleep = sleep
        self._clock = clock
        self._ultima_req: float | None = None
        self._robots: urllib.robotparser.RobotFileParser | None = None
        self._robots_expira: float = 0.0
        self._crawl_delay_ms: int = 0
        self.circuito = EstadoCircuito()
        self._client = httpx.Client(
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "pt-BR,pt;q=0.9",
            },
            timeout=cfg.timeout_s,
            follow_redirects=True,
            limits=httpx.Limits(max_connections=1, max_keepalive_connections=1),
            transport=transport,
        )

    # ---------------- robots.txt ----------------

    def _carregar_robots(self) -> None:
        if self._robots is not None and self._clock() < self._robots_expira:
            return
        url = urljoin(self.cfg.base_url, "/robots.txt")
        rp = urllib.robotparser.RobotFileParser()
        try:
            r = self._client.get(url)
            if r.status_code == 200:
                rp.parse(r.text.splitlines())
            else:
                # Sem robots.txt legível: seguimos com o limite configurado,
                # que já é conservador.
                rp.parse([])
        except httpx.HTTPError as exc:
            log.warning("robots.txt inacessível em %s: %s", url, exc)
            rp.parse([])

        self._robots = rp
        self._robots_expira = self._clock() + 24 * 3600

        delay = None
        try:
            delay = rp.crawl_delay(USER_AGENT) or rp.crawl_delay("*")
        except Exception:  # parser antigo pode não implementar
            delay = None
        self._crawl_delay_ms = int(float(delay) * 1000) if delay else 0
        if self._crawl_delay_ms:
            log.info("%s: Crawl-delay de %sms declarado no robots.txt",
                     self.cfg.fonte, self._crawl_delay_ms)

    def permitido(self, url: str) -> bool:
        self._carregar_robots()
        assert self._robots is not None
        return self._robots.can_fetch(USER_AGENT, url)

    # ---------------- ritmo ----------------

    def _intervalo_ms(self) -> int:
        # O maior entre o nosso limite e o Crawl-delay do site.
        return max(self.cfg.req_interval_ms, self._crawl_delay_ms)

    def _aguardar_vez(self) -> None:
        intervalo = self._intervalo_ms() / 1000
        jitter = random.uniform(0, self.cfg.jitter_ms / 1000)
        if self._ultima_req is not None:
            decorrido = self._clock() - self._ultima_req
            espera = intervalo + jitter - decorrido
            if espera > 0:
                self._sleep(espera)
        else:
            self._sleep(jitter)
        self._ultima_req = self._clock()

    # ---------------- circuit breaker ----------------

    def _registrar_sucesso(self) -> None:
        self.circuito.falhas_seguidas = 0

    def _registrar_bloqueio(self, status: int) -> None:
        cb = self.cfg.circuit_breaker
        self.circuito.falhas_seguidas += 1
        if self.circuito.falhas_seguidas < cb.falhas_para_pausar:
            return

        agora = _agora()
        self.circuito.pausado_ate = agora + timedelta(hours=cb.pausa_horas)
        self.circuito.falhas_seguidas = 0
        self.circuito.pausas_na_janela = [
            p for p in self.circuito.pausas_na_janela if agora - p < timedelta(days=7)
        ] + [agora]
        self.circuito.motivo = f"HTTP {status} repetido"
        log.warning("%s: circuito aberto até %s (%s)",
                    self.cfg.fonte, self.circuito.pausado_ate, self.circuito.motivo)

        if len(self.circuito.pausas_na_janela) >= cb.pausas_para_desativar:
            self.circuito.desativado = True
            log.error("%s: adapter DESATIVADO após %d pausas em 7 dias. "
                      "Escalar: reduzir taxa, usar sitemap, pedir autorização.",
                      self.cfg.fonte, len(self.circuito.pausas_na_janela))

    def _checar_circuito(self) -> None:
        if self.circuito.desativado:
            raise FontePausada(
                f"{self.cfg.fonte}: adapter desativado ({self.circuito.motivo}). "
                "Requer decisão humana."
            )
        if self.circuito.pausado_ate and _agora() < self.circuito.pausado_ate:
            raise FontePausada(
                f"{self.cfg.fonte}: em pausa até {self.circuito.pausado_ate.isoformat()}"
            )

    # ---------------- requisição ----------------

    def get(
        self,
        url: str,
        etag: str | None = None,
        last_modified: str | None = None,
    ) -> Resposta:
        """GET educado, com conditional GET quando há validador conhecido."""
        self._checar_circuito()

        if not dentro_da_janela(self.cfg.janela_coleta):
            raise ForaDaJanela(
                f"{self.cfg.fonte}: fora da janela {self.cfg.janela_coleta}"
            )

        if urlparse(url).netloc and not self.permitido(url):
            raise BloqueadoPorRobots(f"robots.txt não permite: {url}")

        headers: dict[str, str] = {}
        if etag:
            headers["If-None-Match"] = etag
        if last_modified:
            headers["If-Modified-Since"] = last_modified

        ultimo_status = 0
        for tentativa in range(1, self.cfg.max_retries + 1):
            self._aguardar_vez()
            try:
                r = self._client.get(url, headers=headers)
            except httpx.HTTPError as exc:
                log.warning("%s: erro de rede em %s (tentativa %d): %s",
                            self.cfg.fonte, url, tentativa, exc)
                self._backoff(tentativa)
                continue

            ultimo_status = r.status_code

            if r.status_code == 304:
                self._registrar_sucesso()
                return Resposta(url, 304, None, etag, last_modified, True)

            if r.status_code == 200:
                self._registrar_sucesso()
                return Resposta(
                    url=str(r.url),
                    status=200,
                    html=r.text,
                    etag=r.headers.get("etag"),
                    last_modified=r.headers.get("last-modified"),
                    nao_modificado=False,
                )

            if r.status_code in STATUS_BLOQUEIO:
                self._registrar_bloqueio(r.status_code)
                self._checar_circuito()  # pode abrir aqui mesmo
                self._backoff(tentativa, r.headers.get("retry-after"))
                continue

            if 500 <= r.status_code < 600:
                self._backoff(tentativa)
                continue

            # 4xx que não é bloqueio (404, 410): não adianta insistir.
            return Resposta(str(r.url), r.status_code, None, None, None, False)

        return Resposta(url, ultimo_status, None, None, None, False)

    def _backoff(self, tentativa: int, retry_after: str | None = None) -> None:
        if retry_after:
            try:
                self._sleep(min(float(retry_after), 300))
                return
            except ValueError:
                pass
        self._sleep(min(2 ** tentativa, 60))

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "PoliteClient":
        return self

    def __exit__(self, *exc) -> None:
        self.close()

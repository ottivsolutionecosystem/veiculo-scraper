"""Configuração por fonte.

Cada fonte declara seu nível de acesso e sua base legal. Adapter sem base legal
declarada não sobe: `AdapterConfig.__post_init__` levanta erro.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Literal

NivelAcesso = Literal["feed_oficial", "autorizado", "publico_educado", "manual"]

# Identificação honesta do bot. Trocar pelo domínio real antes de subir.
BOT_NAME = os.getenv("BOT_NAME", "OttivBot")
BOT_VERSION = os.getenv("BOT_VERSION", "1.0")
BOT_CONTACT_URL = os.getenv("BOT_CONTACT_URL", "https://exemplo.com.br/bot")
BOT_CONTACT_EMAIL = os.getenv("BOT_CONTACT_EMAIL", "contato@exemplo.com.br")

USER_AGENT = f"{BOT_NAME}/{BOT_VERSION} (+{BOT_CONTACT_URL}; {BOT_CONTACT_EMAIL})"


@dataclass(frozen=True)
class CircuitBreakerConfig:
    falhas_para_pausar: int = 3
    pausa_horas: int = 6
    pausas_para_desativar: int = 3


@dataclass(frozen=True)
class AdapterConfig:
    fonte: str
    nivel_acesso: NivelAcesso
    base_legal: str
    base_url: str

    req_interval_ms: int = 4000
    jitter_ms: int = 1500
    max_retries: int = 3
    timeout_s: float = 20.0

    # Coleta para depois de N anúncios conhecidos e inalterados em sequência.
    early_stop_n: int = 25

    # "01:00-06:00" ou None para qualquer horário.
    janela_coleta: str | None = None

    usar_sitemap: bool = True
    ativa: bool = True

    circuit_breaker: CircuitBreakerConfig = field(default_factory=CircuitBreakerConfig)

    # Concorrência é literal: uma conexão por host. Não vira parâmetro.
    max_concurrency: int = 1

    def __post_init__(self) -> None:
        if not self.base_legal.strip():
            raise ValueError(
                f"fonte '{self.fonte}': base_legal é obrigatória "
                "(link da doc, e-mail de autorização, ou 'robots.txt permite')"
            )
        if self.max_concurrency != 1:
            raise ValueError("max_concurrency é fixo em 1")
        if self.req_interval_ms < 1000:
            raise ValueError("req_interval_ms mínimo é 1000")


FONTES: dict[str, AdapterConfig] = {
    "shopcar": AdapterConfig(
        fonte="shopcar",
        nivel_acesso="publico_educado",
        base_legal="robots.txt permite; autorização solicitada por e-mail em <<data>>",
        base_url="https://www.shopcar.com.br",
        req_interval_ms=4000,
        usar_sitemap=True,
    ),
    # Só habilitar após homologação no portal de desenvolvedores (Sensedia).
    # Enquanto isso, permanece desligada — a página pública roda atrás de
    # proteção anti-bot e contorná-la está fora de escopo.
    "webmotors": AdapterConfig(
        fonte="webmotors",
        nivel_acesso="autorizado",
        base_legal="PENDENTE — homologação Sensedia / API Marketplace",
        base_url="https://www.webmotors.com.br",
        ativa=False,
    ),
    # Entrada manual: o usuário cola a URL do anúncio no painel.
    "olx": AdapterConfig(
        fonte="olx",
        nivel_acesso="manual",
        base_legal="entrada manual pelo usuário; sem coleta automatizada",
        base_url="https://www.olx.com.br",
        ativa=False,
    ),
}

"""Tipos do domínio da coleta.

`AnuncioBruto` é o que sai do adapter. `VeiculoNormalizado` é o que entra no
banco depois de `normalize.py`. O `raw` é sempre preservado: reprocessar regra
de normalização não pode exigir nova coleta.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any


@dataclass
class CardListagem:
    """Uma linha da página de busca. Preço vem daqui para decidir se vale
    gastar requisição na ficha — listagem é barata, ficha não."""

    url: str
    id_externo: str
    preco_texto: str | None = None
    tipo_anunciante: str | None = None


@dataclass
class AnuncioBruto:
    fonte: str
    id_externo: str
    url: str
    titulo: str
    preco_texto: str | None = None
    km_texto: str | None = None
    ano_texto: str | None = None
    cambio_texto: str | None = None
    combustivel_texto: str | None = None
    cor_texto: str | None = None
    cidade_texto: str | None = None
    fotos: list[str] = field(default_factory=list)
    vendedor_nome: str | None = None
    vendedor_telefone: str | None = None
    vendedor_tipo: str | None = None  # "particular" | "loja" | None (não detectado)
    # Quando a fonte publica modelo/versão separados do ruído comercial
    # (Shopcar: "MARCA - Categoria - Modelo Versão"), o adapter preenche isto
    # e o pipeline não precisa adivinhar por regex.
    marca_texto: str | None = None
    modelo_versao_texto: str | None = None
    categoria: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)
    coletado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def content_hash(self) -> str:
        """Hash dos campos que importam para reprocessamento.

        Se o hash não mudou, o pipeline para aqui: só atualiza `ultima_vista_em`.
        Campos voláteis (posição na listagem, contadores de visualização) ficam
        de fora de propósito.
        """
        relevante = {
            "titulo": self.titulo,
            "preco": self.preco_texto,
            "km": self.km_texto,
            "ano": self.ano_texto,
            "fotos": sorted(self.fotos),
            "cidade": self.cidade_texto,
        }
        blob = json.dumps(relevante, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(blob.encode("utf-8")).hexdigest()


@dataclass
class VeiculoNormalizado:
    fonte: str
    id_externo: str
    url: str
    titulo_original: str
    titulo_normalizado: str

    marca: str | None = None
    modelo: str | None = None
    versao: str | None = None
    ano_fabricacao: int | None = None
    ano_modelo: int | None = None
    km: int | None = None
    preco: int | None = None  # centavos
    cambio: str | None = None
    combustivel: str | None = None
    cor: str | None = None
    cidade: str | None = None
    uf: str | None = None
    fotos: list[str] = field(default_factory=list)
    tipo_anunciante: str | None = None  # "particular" | "loja" | None

    content_hash: str = ""
    fingerprint: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

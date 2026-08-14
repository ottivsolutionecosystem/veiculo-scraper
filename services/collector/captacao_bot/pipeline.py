"""Do anúncio bruto ao veículo normalizado, com fingerprint de dedupe."""

from __future__ import annotations

import hashlib

from .models import AnuncioBruto, VeiculoNormalizado
from . import normalize as N

# Faixa de km usada no fingerprint. O mesmo carro anunciado em duas fontes
# raramente tem km idêntico (um diz 45.000, outro 45.320), então arredondamos.
FAIXA_KM = 5_000


def faixa_km(km: int | None) -> str:
    if km is None:
        return "NA"
    return str(km // FAIXA_KM)


def fingerprint(v: VeiculoNormalizado) -> str:
    """Chave de dedupe do veículo canônico.

    Deliberadamente NÃO usa preço: o mesmo carro em duas fontes costuma ter
    preço diferente, e é justamente essa diferença que interessa depois.
    """
    partes = [
        v.marca or "?",
        v.modelo or "?",
        str(v.ano_modelo or "?"),
        faixa_km(v.km),
        (v.cor or "?").upper(),
        (v.cidade or "?").upper(),
    ]
    blob = "|".join(partes)
    return hashlib.sha1(blob.encode("utf-8")).hexdigest()


def normalizar(bruto: AnuncioBruto) -> VeiculoNormalizado:
    titulo_limpo = N.limpar_titulo(bruto.titulo)
    marca, modelo = N.extrair_marca_modelo(titulo_limpo)

    # Ano pode estar no campo próprio ou embutido no título.
    ano_fab, ano_mod = N.extrair_anos(bruto.ano_texto)
    if ano_fab is None:
        ano_fab, ano_mod = N.extrair_anos(bruto.titulo)

    texto_completo = " ".join(
        filter(None, [bruto.titulo, bruto.cambio_texto, bruto.combustivel_texto])
    )
    cidade, uf = N.extrair_cidade_uf(bruto.cidade_texto)

    v = VeiculoNormalizado(
        fonte=bruto.fonte,
        id_externo=bruto.id_externo,
        url=bruto.url,
        titulo_original=bruto.titulo,
        titulo_normalizado=titulo_limpo,
        marca=marca,
        modelo=modelo,
        versao=None,  # resolvido no match FIPE, não aqui
        ano_fabricacao=ano_fab,
        ano_modelo=ano_mod,
        km=N.extrair_km(bruto.km_texto) or N.extrair_km(bruto.titulo),
        preco=N.extrair_preco(bruto.preco_texto),
        cambio=N.extrair_cambio(texto_completo),
        combustivel=N.extrair_combustivel(texto_completo),
        cor=(bruto.cor_texto or "").strip().upper() or None,
        cidade=cidade,
        uf=uf,
        fotos=bruto.fotos,
        content_hash=bruto.content_hash(),
    )
    v.fingerprint = fingerprint(v)
    return v


def precisa_revisao(v: VeiculoNormalizado) -> list[str]:
    """Campos que faltaram. Veículo com pendência entra na fila de revisão em
    vez de ser descartado — descarte silencioso é perda de oportunidade."""
    faltando = []
    if not v.marca:
        faltando.append("marca")
    if not v.modelo:
        faltando.append("modelo")
    if not v.ano_modelo:
        faltando.append("ano_modelo")
    if v.preco is None:
        faltando.append("preco")
    if v.km is None:
        faltando.append("km")
    return faltando

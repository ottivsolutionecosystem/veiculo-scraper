"""CLI da coleta.

    python -m captacao_bot.cli robots  --fonte shopcar
    python -m captacao_bot.cli fixture --fonte shopcar --url https://...
    python -m captacao_bot.cli parse   --fonte shopcar --arquivo tests/fixtures/x.html
    python -m captacao_bot.cli coletar --fonte shopcar --limite 20 --dry-run
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path

from .adapters.shopcar import ShopcarAdapter
from .config import FONTES, USER_AGENT
from .http_client import PoliteClient
from .pipeline import normalizar, precisa_revisao
from .storage import MemoryStorage
from .runner import Runner

ADAPTERS = {"shopcar": ShopcarAdapter}


def _adapter(fonte: str):
    if fonte not in FONTES:
        sys.exit(f"fonte desconhecida: {fonte}. Disponíveis: {', '.join(FONTES)}")
    if fonte not in ADAPTERS:
        sys.exit(
            f"fonte '{fonte}' não tem adapter automatizado "
            f"(nível de acesso: {FONTES[fonte].nivel_acesso})."
        )
    return ADAPTERS[fonte](FONTES[fonte])


def cmd_robots(args) -> None:
    cfg = FONTES[args.fonte]
    with PoliteClient(cfg) as client:
        print(f"User-Agent: {USER_AGENT}")
        alvo = args.url or cfg.base_url
        print(f"{alvo}: {'PERMITIDO' if client.permitido(alvo) else 'BLOQUEADO'}")
        print(f"intervalo efetivo: {client._intervalo_ms()} ms")


def cmd_fixture(args) -> None:
    cfg = FONTES[args.fonte]
    destino = Path(args.saida or f"tests/fixtures/{args.fonte}_{os.urandom(3).hex()}.html")
    destino.parent.mkdir(parents=True, exist_ok=True)
    with PoliteClient(cfg) as client:
        resposta = client.get(args.url)
        if not resposta.ok or resposta.html is None:
            sys.exit(f"falhou: HTTP {resposta.status}")
        destino.write_text(resposta.html, encoding="utf-8")
    print(f"salvo em {destino} ({len(resposta.html)} bytes)")
    print("Ajuste SELETORES contra este arquivo, não contra o site.")


def cmd_parse(args) -> None:
    adapter = _adapter(args.fonte)
    html = Path(args.arquivo).read_text(encoding="utf-8")
    bruto = adapter.parse_anuncio(html, args.url or "https://exemplo/veiculo/1")
    if bruto is None:
        sys.exit("parse_anuncio devolveu None — seletores não casaram.")
    veiculo = normalizar(bruto)
    print(json.dumps(veiculo.to_dict(), indent=2, ensure_ascii=False, default=str))
    pendencias = precisa_revisao(veiculo)
    print(f"\npendências: {pendencias or 'nenhuma'}")


def cmd_coletar(args) -> None:
    adapter = _adapter(args.fonte)
    storage = MemoryStorage()  # trocar por PostgresStorage(conn) em produção
    with PoliteClient(adapter.cfg) as client:
        runner = Runner(adapter, client, storage)
        resultado = runner.coletar(limite=args.limite)
    print(resultado.resumo())
    if args.dry_run:
        for (_, url), reg in list(storage.anuncios.items())[:10]:
            v = reg["veiculo"]
            print(f"  {v.marca or '?':<12} {v.modelo or '?':<14} "
                  f"{v.ano_modelo or '?'}  {(v.preco or 0)/100:>12,.2f}  {url}")


def main() -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    p = argparse.ArgumentParser(prog="captacao_bot")
    sub = p.add_subparsers(dest="cmd", required=True)

    pr = sub.add_parser("robots", help="checa robots.txt e intervalo efetivo")
    pr.add_argument("--fonte", required=True)
    pr.add_argument("--url")
    pr.set_defaults(func=cmd_robots)

    pf = sub.add_parser("fixture", help="salva uma página para desenvolver offline")
    pf.add_argument("--fonte", required=True)
    pf.add_argument("--url", required=True)
    pf.add_argument("--saida")
    pf.set_defaults(func=cmd_fixture)

    pp = sub.add_parser("parse", help="roda o adapter contra um HTML salvo")
    pp.add_argument("--fonte", required=True)
    pp.add_argument("--arquivo", required=True)
    pp.add_argument("--url")
    pp.set_defaults(func=cmd_parse)

    pc = sub.add_parser("coletar", help="executa a coleta")
    pc.add_argument("--fonte", required=True)
    pc.add_argument("--limite", type=int)
    pc.add_argument("--dry-run", action="store_true")
    pc.set_defaults(func=cmd_coletar)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

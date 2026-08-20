# RELATORIO — Nixpacks work (pip)

## Feito
- Build `work` no Dokploy falhava: `python3 -m pip` → No module named pip.
- Python do serviço `work` passou a vir do apt (`python3`, `python3-pip`,
  `python3-venv`); deps do coletor vão para `/app/.venv`.
- `start-work.sh` usa esse venv via `PYTHON_BIN` quando ele existe.

## Decidido por mim e por quê
- Não insistir em `python312Packages.pip` no Nix: o pacote não entra no
  site-packages do `python312`, e o store é somente leitura.
- venv em vez de `pip install --break-system-packages`: isolamento e
  PEP 668 no Ubuntu do Nixpacks.

## Pendente de decisão sua
- Redeploy do serviço `work` no Dokploy com este commit.

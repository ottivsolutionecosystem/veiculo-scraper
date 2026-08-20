"""Normalização de anúncio.

É aqui que "GOL 1.0 FLEX COMPLETÃO 15/16 IPVA PAGO!!!" vira
marca=VOLKSWAGEN, modelo=GOL, ano_fab=2015, ano_mod=2016, combustivel=FLEX.

Regra de ouro: nunca inventar. Campo que não dá para extrair com confiança fica
`None` e o veículo entra na fila de revisão. Preencher no chute contamina o
match FIPE e o score depois.
"""

from __future__ import annotations

import re
import unicodedata

# Ruído comercial que não descreve o veículo.
RUIDO = [
    r"\bIPVA\s*(20\d{2}\s*)?(PAG[OA]|GR[ÁA]TIS)\b",
    r"\bCOMPLET(O|A|ÃO|AO)\b",
    r"\b[ÚU]NIC[OA]\s+DON[OA]\b",
    r"\bNOV[OA]\b",
    r"\bIMPEC[ÁA]VEL\b",
    r"\bOPORTUNIDADE\b",
    r"\bREVIS(ADO|ÕES|OES)\b",
    r"\bACEITO?\s+TROCA\b",
    r"\bFINANCI[AO]\w*\b",
    r"\bENTRADA\s+DE\s+R?\$?\s*[\d\.\,]+",
    r"\bABAIXO\s+D[AO]\s+(TABELA|FIPE)\b",
    r"\bLINDO\b|\bTOP\b|\bZER[OA]\b",
]
_RUIDO_RE = re.compile("|".join(RUIDO), re.IGNORECASE)
_PONTUACAO_RE = re.compile(r"[!?*~•|]+")
_ESPACOS_RE = re.compile(r"\s+")

MARCAS = {
    "VW": "VOLKSWAGEN", "VOLKSWAGEN": "VOLKSWAGEN", "GM": "CHEVROLET",
    "CHEVROLET": "CHEVROLET", "FIAT": "FIAT", "FORD": "FORD",
    "TOYOTA": "TOYOTA", "HONDA": "HONDA", "HYUNDAI": "HYUNDAI",
    "RENAULT": "RENAULT", "NISSAN": "NISSAN", "JEEP": "JEEP",
    "PEUGEOT": "PEUGEOT", "CITROEN": "CITROEN", "CITROËN": "CITROEN",
    "MITSUBISHI": "MITSUBISHI", "KIA": "KIA", "CAOA": "CAOA CHERY",
    "CHERY": "CAOA CHERY", "BMW": "BMW", "MERCEDES": "MERCEDES-BENZ",
    "MERCEDES-BENZ": "MERCEDES-BENZ", "AUDI": "AUDI", "VOLVO": "VOLVO",
    "LAND": "LAND ROVER", "RAM": "RAM", "MINI": "MINI", "SUZUKI": "SUZUKI",
    "SUBARU": "SUBARU", "CHRYSLER": "CHRYSLER", "DODGE": "DODGE",
    "BYD": "BYD", "GWM": "GWM", "IVECO": "IVECO", "JAC": "JAC",
    "PORSCHE": "PORSCHE", "JAGUAR": "JAGUAR", "LEXUS": "LEXUS",
    "MOTORS": None,  # evita casar "SHOP CAR MOTORS"
}

# Marca escrita com mais de uma palavra pela fonte ("VW - VolksWagen",
# "GM - Chevrolet"). Chave é o texto dobrado (sem acento, só A-Z0-9 e espaço),
# então "Mercedes-Benz" e "MERCEDES BENZ" caem na mesma entrada.
MARCAS_COMPOSTAS = {
    "VW VOLKSWAGEN": "VOLKSWAGEN",
    "GM CHEVROLET": "CHEVROLET",
    "MERCEDES BENZ": "MERCEDES-BENZ",
    "CAOA CHERY": "CAOA CHERY",
    "LAND ROVER": "LAND ROVER",
    "KIA MOTORS": "KIA",
    "GREAT WALL": "GWM",
}

_NAO_ALFANUM_RE = re.compile(r"[^A-Z0-9]+")

# Carroceria que a fonte cola no nome ("C3 Hatch Exclusive"): não é modelo nem
# versão, e como token atrapalha o match FIPE.
CARROCERIA = frozenset({"HATCH", "HATCHBACK", "HB", "PERUA", "PICAPE"})

# Modelos comuns cuja marca é inequívoca — resolve título sem marca escrita.
MODELO_PARA_MARCA = {
    "GOL": "VOLKSWAGEN", "POLO": "VOLKSWAGEN", "VIRTUS": "VOLKSWAGEN",
    "T-CROSS": "VOLKSWAGEN", "TCROSS": "VOLKSWAGEN", "NIVUS": "VOLKSWAGEN",
    "SAVEIRO": "VOLKSWAGEN", "VOYAGE": "VOLKSWAGEN", "JETTA": "VOLKSWAGEN",
    "ONIX": "CHEVROLET", "PRISMA": "CHEVROLET", "TRACKER": "CHEVROLET",
    "S10": "CHEVROLET", "CRUZE": "CHEVROLET", "SPIN": "CHEVROLET",
    "MONTANA": "CHEVROLET",
    "STRADA": "FIAT", "TORO": "FIAT", "ARGO": "FIAT", "MOBI": "FIAT",
    "CRONOS": "FIAT", "PULSE": "FIAT", "UNO": "FIAT", "PALIO": "FIAT",
    "FASTBACK": "FIAT",
    "KA": "FORD", "RANGER": "FORD", "ECOSPORT": "FORD", "FIESTA": "FORD",
    "COROLLA": "TOYOTA", "HILUX": "TOYOTA", "YARIS": "TOYOTA",
    "COROLLA CROSS": "TOYOTA", "YARIS CROSS": "TOYOTA",
    "ETIOS": "TOYOTA", "SW4": "TOYOTA", "RAV4": "TOYOTA",
    "ONIX PLUS": "CHEVROLET", "SPIN ACTIV": "CHEVROLET",
    "C4 CACTUS": "CITROEN", "C4 LOUNGE": "CITROEN",
    "TIGGO 5X": "CAOA CHERY", "TIGGO 7": "CAOA CHERY", "TIGGO 8": "CAOA CHERY",
    "PAJERO SPORT": "MITSUBISHI", "L200 TRITON": "MITSUBISHI",
    "ECLIPSE CROSS": "MITSUBISHI", "OUTLANDER SPORT": "MITSUBISHI",
    "RANGE ROVER": "LAND ROVER", "SANTA FE": "HYUNDAI",
    "HB20S": "HYUNDAI", "HB20X": "HYUNDAI",
    "GRAND CHEROKEE": "JEEP", "GRAND SIENA": "FIAT",
    "BRONCO SPORT": "FORD", "KA+": "FORD", "KA PLUS": "FORD",
    "CIVIC": "HONDA", "HR-V": "HONDA", "HRV": "HONDA", "FIT": "HONDA",
    "CITY": "HONDA", "WR-V": "HONDA",
    "HB20": "HYUNDAI", "CRETA": "HYUNDAI", "TUCSON": "HYUNDAI",
    "KWID": "RENAULT", "SANDERO": "RENAULT", "DUSTER": "RENAULT",
    "LOGAN": "RENAULT", "OROCH": "RENAULT",
    "KICKS": "NISSAN", "FRONTIER": "NISSAN", "VERSA": "NISSAN",
    "COMPASS": "JEEP", "RENEGADE": "JEEP", "COMMANDER": "JEEP",
    "L200": "MITSUBISHI", "PAJERO": "MITSUBISHI",
}

CAMBIO = {
    "AUTOMATICO": "AUTOMATICO", "AUTOMATICA": "AUTOMATICO", "AUT": "AUTOMATICO",
    "AT": "AUTOMATICO", "CVT": "AUTOMATICO", "TIPTRONIC": "AUTOMATICO",
    "DSG": "AUTOMATICO", "AUTOMATIZADO": "AUTOMATIZADO",
    "MANUAL": "MANUAL", "MEC": "MANUAL", "MECANICO": "MANUAL",
}

COMBUSTIVEL = {
    "FLEX": "FLEX", "GASOLINA": "GASOLINA", "ALCOOL": "ALCOOL",
    "ETANOL": "ALCOOL", "DIESEL": "DIESEL", "GNV": "GNV",
    "HIBRIDO": "HIBRIDO", "ELETRICO": "ELETRICO",
}

UFS = {
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
    "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
    "SP", "SE", "TO",
}


def sem_acento(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def limpar_titulo(titulo: str) -> str:
    """Remove ruído comercial, acento e pontuação excessiva. Mantém a ordem."""
    t = sem_acento(titulo).upper()
    t = _RUIDO_RE.sub(" ", t)
    t = _PONTUACAO_RE.sub(" ", t)
    t = re.sub(r"[^A-Z0-9\.\,\-/ ]", " ", t)
    return _ESPACOS_RE.sub(" ", t).strip()


def extrair_preco(texto: str | None) -> int | None:
    """Devolve centavos. Ignora valor de parcela e entrada."""
    if not texto:
        return None
    t = sem_acento(texto).upper()
    if re.search(r"\b\d+\s*X\b|PARCELA|ENTRADA|A PARTIR DE", t):
        return None
    m = re.search(r"R?\$?\s*(\d[\d\.]*(?:,\d{1,2})?)", t)
    if not m:
        return None
    bruto = m.group(1)

    if "," in bruto:
        # Formato brasileiro: ponto é milhar, vírgula é decimal.
        bruto = bruto.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"\d+\.\d{1,2}", bruto):
        # Formato de dado estruturado (JSON-LD): "104900.00".
        pass
    else:
        # Só milhares: "104.900".
        bruto = bruto.replace(".", "")

    try:
        valor = float(bruto)
    except ValueError:
        return None
    # Fora dessa faixa é lixo (telefone, código de anúncio, "sob consulta").
    if not (1_000 <= valor <= 5_000_000):
        return None
    return int(round(valor * 100))


def extrair_km(texto: str | None) -> int | None:
    if not texto:
        return None
    t = sem_acento(texto).upper().replace("QUILOMETROS", "KM")
    # KMT é o unitCode de quilômetro no schema.org (UN/CEFACT).
    m = re.search(r"([\d\.\, ]{1,12})\s*KMT?\b", t)
    if not m:
        m = re.search(r"\bKMT?\s*:?\s*([\d\.\, ]{1,12})", t)
    if not m:
        return None
    digitos = re.sub(r"\D", "", m.group(1))
    if not digitos:
        return None
    km = int(digitos)
    if km > 1_500_000:
        return None
    # "12 mil km" e afins não são tratados aqui de propósito: vão para revisão.
    return km


def extrair_anos(texto: str | None) -> tuple[int | None, int | None]:
    """Devolve (ano_fabricacao, ano_modelo).

    Aceita "2015/2016", "15/16" e ano solto. Ano solto vira os dois campos.
    """
    if not texto:
        return None, None
    t = sem_acento(texto)

    m = re.search(r"\b(19|20)(\d{2})\s*/\s*(19|20)?(\d{2})\b", t)
    if m:
        fab = int(m.group(1) + m.group(2))
        sufixo_mod = m.group(4)
        prefixo_mod = m.group(3) or ("20" if int(sufixo_mod) < 50 else "19")
        mod = int(prefixo_mod + sufixo_mod)
        if _ano_valido(fab) and _ano_valido(mod) and 0 <= mod - fab <= 1:
            return fab, mod

    m = re.search(r"\b(\d{2})\s*/\s*(\d{2})\b", t)
    if m:
        fab = _expandir_ano(int(m.group(1)))
        mod = _expandir_ano(int(m.group(2)))
        if fab and mod and 0 <= mod - fab <= 1:
            return fab, mod

    anos = [int(a) for a in re.findall(r"\b(?:19|20)\d{2}\b", t) if _ano_valido(int(a))]
    if anos:
        return anos[0], anos[0]
    return None, None


def _ano_valido(ano: int) -> bool:
    return 1950 <= ano <= 2100


def _expandir_ano(dois_digitos: int) -> int | None:
    ano = 2000 + dois_digitos if dois_digitos < 50 else 1900 + dois_digitos
    return ano if _ano_valido(ano) else None


def marca_canonica(texto: str | None) -> str | None:
    """"VW - VolksWagen" -> VOLKSWAGEN. "MERCEDES-BENZ" -> MERCEDES-BENZ.

    A fonte publica a marca num campo próprio; usar esse campo em vez de
    adivinhar pelo primeiro token do título é o que impede "VW Volkswagen
    Amarok" de virar modelo=VOLKSWAGEN.
    """
    if not texto:
        return None
    dobrado = _NAO_ALFANUM_RE.sub(" ", sem_acento(texto).upper()).strip()
    if not dobrado:
        return None
    if dobrado in MARCAS_COMPOSTAS:
        return MARCAS_COMPOSTAS[dobrado]
    tokens = dobrado.split()
    if len(tokens) >= 2:
        composta = " ".join(tokens[:2])
        if composta in MARCAS_COMPOSTAS:
            return MARCAS_COMPOSTAS[composta]
    for token in tokens:
        if MARCAS.get(token):
            return MARCAS[token]
    return None


# Marcas cujo nome de modelo é letra + número ("A 200", "C 180", "GLA 200").
# Fora delas, número depois do modelo é cilindrada ou potência, não nome.
MARCAS_MODELO_COM_NUMERO = frozenset({"MERCEDES-BENZ"})


def separar_modelo_versao(texto: str | None, marca: str | None = None) -> tuple[str | None, str | None]:
    """"Amarok Highline 3.0TDi V6 24v 4x4 C.D." -> ("AMAROK", "HIGHLINE ...").

    O segundo token entra no modelo em dois casos: dígito solto ("Arrizo 6",
    "Mazda 3") e marca que nomeia modelo com número ("A 200"). Cilindrada
    ("1.0") e válvulas ("16V") nunca entram — são especificação, e como modelo
    fariam o veto do match FIPE derrubar o candidato certo.
    """
    if not texto:
        return None, None
    tokens = [t for t in _ESPACOS_RE.sub(" ", sem_acento(texto).upper()).split() if t]
    tokens = [t for t in tokens if t not in CARROCERIA]
    if not tokens:
        return None, None

    tamanho = 1
    if len(tokens) >= 2:
        dois = " ".join(tokens[:2])
        if dois in MODELO_PARA_MARCA:
            tamanho = 2
    if tamanho == 1 and len(tokens) > 1 and tokens[1].isdigit():
        if len(tokens[1]) == 1 or (marca in MARCAS_MODELO_COM_NUMERO and tokens[0].isalpha()):
            tamanho = 2

    modelo = " ".join(tokens[:tamanho])
    versao = " ".join(tokens[tamanho:]) or None
    return modelo, versao


def extrair_marca_modelo(titulo_limpo: str) -> tuple[str | None, str | None]:
    """Caminho de fallback: quando a fonte não publica marca em campo próprio,
    acha a marca no título e o modelo logo depois dela."""
    tokens = titulo_limpo.split()
    marca = None
    idx_marca = -1

    for i, tok in enumerate(tokens):
        if MARCAS.get(tok):
            marca = MARCAS[tok]
            idx_marca = i
            # "VW Volkswagen": os dois tokens são a mesma marca, o modelo só
            # começa depois do último deles.
            while idx_marca + 1 < len(tokens) and MARCAS.get(tokens[idx_marca + 1]) == marca:
                idx_marca += 1
            break

    # Modelos compostos primeiro ("COROLLA CROSS" antes de "COROLLA").
    for tamanho in (2, 1):
        for i in range(len(tokens) - tamanho + 1):
            candidato = " ".join(tokens[i : i + tamanho])
            if candidato in MODELO_PARA_MARCA:
                if marca is None:
                    marca = MODELO_PARA_MARCA[candidato]
                return marca, candidato

    if marca and idx_marca + 1 < len(tokens):
        modelo, _ = separar_modelo_versao(" ".join(tokens[idx_marca + 1 :]), marca)
        return marca, modelo
    return marca, None


def extrair_cambio(texto: str) -> str | None:
    t = sem_acento(texto).upper()
    for chave, valor in CAMBIO.items():
        if re.search(rf"\b{chave}\b", t):
            return valor
    return None


def extrair_combustivel(texto: str) -> str | None:
    t = sem_acento(texto).upper()
    for chave, valor in COMBUSTIVEL.items():
        if re.search(rf"\b{chave}\b", t):
            return valor
    return None


def extrair_cidade_uf(texto: str | None) -> tuple[str | None, str | None]:
    if not texto:
        return None, None
    t = _ESPACOS_RE.sub(" ", texto.strip())
    m = re.search(r"^(.*?)[\s,\-/]+([A-Za-z]{2})$", t)
    if m and m.group(2).upper() in UFS:
        return m.group(1).strip(" ,-/").title(), m.group(2).upper()
    return t.title(), None

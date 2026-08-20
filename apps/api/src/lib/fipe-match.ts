/**
 * Match FIPE (SPEC seção 8).
 *
 * A tabela FIPE guarda o carro numa string só — "COMPASS LIMITED 1.3 TB 4x2
 * Flex Aut." — enquanto o anúncio chega com modelo e versão separados
 * ("COMPASS" + "LIMITED 1.3 16V T270"). Casar isso por similaridade de
 * string inteira erra: "Compass Limited 1.3" e "Compass Longitude 1.3" são
 * 90% iguais como texto e têm preços bem diferentes.
 *
 * Então aqui não há nota de similaridade solta. Há vetos e há desempate:
 *
 * - **Veto** de modelo: o nome FIPE tem que conter o modelo do anúncio.
 * - **Veto** de ano: ano-modelo igual, sem "aproximado". Ano errado é preço
 *   errado, e preço errado vira desconto inventado.
 * - **Veto** de cilindrada: 1.3 nunca casa com 2.0.
 * - **Veto** de diesel: um Hilux diesel não é o mesmo carro que um flex.
 * - **Desempate** por versão, tração, câmbio e combustível.
 *
 * Quem passa os vetos e ainda empata com outro candidato vai para revisão em
 * vez de ser escolhido no sorteio.
 */

import { brandsCompatible } from "./fipe-brands.js";

export interface FipeCandidate {
  fipeCode: string;
  brand: string;
  /** Nome completo da FIPE: modelo + versão + motor + combustível + câmbio. */
  model: string;
  modelYear: number;
  fuelType: string;
}

export interface FipeMatchInput {
  brand: string | null;
  model: string | null;
  trim: string | null;
  normalizedTitle: string;
  modelYear: number | null;
  fuelType: string | null;
  transmission: string | null;
}

export interface FipeMatchResult {
  candidate: FipeCandidate;
  confidence: number; // 0-1
}

const AUTO_THRESHOLD = 0.85;
const REVIEW_THRESHOLD = 0.6;
/** Dois candidatos colados é ambiguidade, não vitória. Vai para revisão. */
const MARGEM_MINIMA = 0.03;
/** Sem ano-modelo no anúncio nenhum match é automático. */
const TETO_SEM_ANO = 0.8;

/** Palavras presentes/ausentes de forma inconsistente entre FIPE e anúncio:
 * não discriminam nada e só sujam a métrica. Combustível e câmbio saem daqui
 * porque entram no cálculo por campo próprio, não por token. */
const RUIDO = new Set([
  // Combustível — inclusive as abreviações que a FIPE usa ("Die.", "Gas.").
  "FLEX", "FLE", "DIESEL", "DIES", "DIE", "GASOLINA", "GAS", "ALCOOL", "ALC",
  "ETANOL", "GNV", "HIBRIDO", "HIBRID", "HIB", "ELETRICO", "ELET", "ELE",
  "ACTIVEFLEX", "TOTALFLEX", "TOTAL",
  // Alimentação/motor: presença inconsistente dos dois lados. TSFI é como a
  // FIPE escreve TFSI em parte das linhas da Audi — erro dela, ruído aqui.
  "TB", "TURBO", "T", "BITURBO", "MPFI", "MPI", "TDI", "TDID", "CTDI", "CRDI",
  "THP", "GDI", "VVT", "MIVEC", "DOHC", "SOHC", "TFSI", "TSFI", "TSI", "HDI",
  "JTD", "EVO",
  // Câmbio: entra pelo campo `transmission`, não como token.
  "AUT", "AUTOMATICO", "AUTOMATICA", "AUTOMATIZADO", "MEC", "MANUAL", "CVT",
  "DSG", "TIPTRONIC", "STRONIC", "TRONIC", "MULTITRONIC", "MULTI", "DUALOGIC",
  "AT", "MT", "XTRONIC", "POWERSHIFT",
  // Carroceria que uma fonte escreve e a outra não.
  "HATCH", "HATCHBACK", "HB",
  "2P", "3P", "4P", "5P",
  "DE", "DA", "DO", "E", "V", "P", "N",
]);

/** A FIPE abrevia demais ("2500 LARAM. 6.7 NIGHT ED. TB CD 4x4 Die."). Corte
 * de 3+ letras vira prefixo e casa sozinho; os curtos precisam de tabela. */
const ABREVIACOES: Record<string, string> = {
  ED: "EDITION",
  EDIT: "EDITION",
  LTD: "LIMITED",
  SR: "SR",
};

const RE_CILINDRADA = /^\d\.\d$/;
const RE_VALVULAS = /^\d{1,2}V$/;
/** Designação comercial de motor: T270 (Jeep/Fiat), T200. Não aparece na
 * FIPE, então contar como ausência puniria o candidato certo. */
const RE_CODIGO_MOTOR = /^[A-Z]\d{2,3}$/;
/** Potência: "220cv", "170cv". Só a FIPE publica, o anúncio quase nunca. */
const RE_POTENCIA = /^\d{2,4}CV$/;
/** Especificação, não nome de versão: 2.8, 16V, V8, 4X4, CD, 24. */
const RE_ESPECIFICACAO = /^(\d\.\d|\d{1,2}V|V\d{1,2}|\d+X\d+|\d+|CD|CS|SW|AWD)$/;

/** Sufixo que marca token cortado pela FIPE ("LARAM.", "F.", "Comfor."). */
const CORTE = ".";

function deaccent(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Token sem a marca de corte — é a forma usada em toda classificação. */
function nucleo(token: string): string {
  return token.endsWith(CORTE) ? token.slice(0, -1) : token;
}

function cortado(token: string): boolean {
  return token.endsWith(CORTE);
}

/** "SRV D4-D 2.8TDI 16V 4X4 C.D." -> [SRV, D4, D, 2.8, TDI, 16V, 4X4, CD]
 *
 * Palavra abreviada com ponto sai marcada: "2500 LARAM. 6.7" -> [2500,
 * "LARAM.", 6.7]. Essa marca é o que autoriza casar "LARAM." com "LARAMIE"
 * sem autorizar casar "LT" com "LTZ". */
export function tokenizeFipe(text: string): string[] {
  const protegido = deaccent(text)
    .toUpperCase()
    // "C.D." é cabine dupla, uma palavra só. Deixar virar "C" e "D" perdia a
    // carroceria da picape — que é diferença de preço, não detalhe.
    .replace(/(?:\b[A-Z]\.){2,}/g, (sigla) => sigla.replace(/\./g, ""))
    // Preserva o ponto decimal antes de varrer a pontuação.
    .replace(/(\d)\.(\d)/g, "$1\u0001$2")
    // Ponto depois de letra é abreviação: marca e separa.
    .replace(/([A-Z])\./g, "$1\u0002 ")
    .replace(/[^A-Z0-9\u0001\u0002]+/g, " ")
    .replace(/\u0001/g, ".")
    // "2.8TDI" -> "2.8 TDI"; "C4.5" já foi tratado acima.
    .replace(/(\d\.\d)(?=[A-Z])/g, "$1 ")
    .replace(/([A-Z])(?=\d\.\d)/g, "$1 ");

  return protegido
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => t.replace(/\u0002/g, CORTE));
}

function relevantes(tokens: readonly string[], excluir: ReadonlySet<string>): Set<string> {
  const saida = new Set<string>();
  for (const token of tokens) {
    const base = nucleo(token);
    if (RUIDO.has(base)) continue;
    if (RE_POTENCIA.test(base)) continue;
    if ([...excluir].some((m) => tokensEquivalentes(token, m))) continue;
    if (RE_CODIGO_MOTOR.test(base) && !RE_VALVULAS.test(base)) continue;
    saida.add(token);
  }
  return saida;
}

function cilindrada(tokens: readonly string[]): string | null {
  return tokens.find((t) => RE_CILINDRADA.test(t)) ?? null;
}

const CAMBIO_AUTO = ["AUT", "AUTOMATICO", "AUTOMATICA", "AUTOMATIZADO", "CVT", "DSG",
  "TIPTRONIC", "AT", "STRONIC", "TRONIC", "MULTITRONIC", "DUALOGIC", "POWERSHIFT"];
const CAMBIO_MANUAL = ["MEC", "MANUAL", "MT"];

function cambioDoNome(tokens: readonly string[]): string | null {
  for (const token of tokens) {
    const base = nucleo(token);
    if (CAMBIO_AUTO.includes(base)) return "AUTO";
    if (CAMBIO_MANUAL.includes(base)) return "MANUAL";
  }
  return null;
}

/** Anúncio diz "automatizado" onde a FIPE diz "Aut." e vice-versa: a
 * distinção não é confiável entre fontes. Só manual vs. não-manual é. */
function classeCambio(cambio: string | null): string | null {
  if (!cambio) return null;
  return cambio === "MANUAL" ? "MANUAL" : "AUTO";
}

function expandir(token: string): string {
  return ABREVIACOES[token] ?? token;
}

/** "LARAM." da FIPE e "LARAMIE" do anúncio são a mesma versão. Token marcado
 * como cortado casa por prefixo de qualquer tamanho — foi a própria FIPE que
 * disse que ali falta texto. Sem a marca, exige 3+ letras: abaixo disso
 * confundiria LT com LTZ, que são versões e preços diferentes. */
export function tokensEquivalentes(a: string, b: string): boolean {
  if (a === b) return true;
  const ea = expandir(nucleo(a));
  const eb = expandir(nucleo(b));
  if (ea === eb) return true;
  if (!/^[A-Z]+$/.test(ea) || !/^[A-Z]+$/.test(eb)) return false;
  const [curto, longo] = ea.length <= eb.length ? [ea, eb] : [eb, ea];
  if (!longo.startsWith(curto)) return false;
  const cortouOCurto = ea.length <= eb.length ? cortado(a) : cortado(b);
  return cortouOCurto || curto.length >= 3;
}

function contarComuns(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  const disponiveis = new Set(b);
  let comuns = 0;
  for (const token of a) {
    for (const outro of disponiveis) {
      if (tokensEquivalentes(token, outro)) {
        disponiveis.delete(outro);
        comuns += 1;
        break;
      }
    }
  }
  return comuns;
}

function f1(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  const comuns = contarComuns(a, b);
  if (comuns === 0) return 0;
  const precisao = comuns / a.size;
  const cobertura = comuns / b.size;
  return (2 * precisao * cobertura) / (precisao + cobertura);
}

/** Nome da versão, sem especificação de motor: LARAMIE, NIGHT, EDITION, SRV.
 * É o que separa dois carros que compartilham motor e carroceria. */
function nomesDeVersao(tokens: ReadonlySet<string>): Set<string> {
  const saida = new Set<string>();
  for (const token of tokens) {
    const base = nucleo(token);
    if (RE_ESPECIFICACAO.test(base)) continue;
    if (base.length < 2) continue;
    saida.add(token);
  }
  return saida;
}

/** Palavra que muda a linha da FIPE, não a versão. Presente no nome FIPE e
 * ausente no anúncio = outro carro. SPORT fica de fora de propósito: Polo
 * Sport e Civic Sport são versão, não família. */
const SUFIXO_FAMILIA = new Set(["CROSS", "PLUS", "ACTIV", "HATCHBACK", "CACTUS"]);

function familiaCompativel(input: FipeMatchInput, tokensFipe: readonly string[]): boolean {
  const doAnuncio = new Set([
    ...tokenizeFipe(input.model ?? ""),
    ...tokenizeFipe(input.trim ?? ""),
    ...tokenizeFipe(input.normalizedTitle),
  ]);
  for (const token of tokensFipe) {
    if (!SUFIXO_FAMILIA.has(nucleo(token))) continue;
    if (![...doAnuncio].some((t) => tokensEquivalentes(t, token))) return false;
  }
  return true;
}

/** Veto de modelo. "COROLLA CROSS" não é uma linha "Corolla XEi", e "C3" não
 * é "C4". A única folga é a letra de câmbio que a FIPE cola no código do
 * modelo em carro alemão: o anúncio diz "320i", a FIPE diz "320iA". */
function modeloCompativel(doAnuncio: string, daFipe: string): boolean {
  if (tokensEquivalentes(doAnuncio, daFipe)) return true;
  const base = nucleo(doAnuncio);
  const fipe = nucleo(daFipe);
  if (!/^\d/.test(base) || !fipe.startsWith(base)) return false;
  return /^[A-Z]{1,2}$/.test(fipe.slice(base.length));
}

/** Tokens que descrevem a versão no lado do anúncio. Sem `trim`, o título
 * serve — descontando marca e modelo, que não desempatam nada. */
function tokensDoAnuncio(input: FipeMatchInput, tokensModelo: ReadonlySet<string>): string[] {
  const bruto = input.trim ?? input.normalizedTitle;
  const tokens = tokenizeFipe(bruto);
  if (input.trim) return tokens;
  const marca = new Set(tokenizeFipe(input.brand ?? ""));
  return tokens.filter((t) => !marca.has(t) && !tokensModelo.has(t));
}

export function scoreFipeCandidate(input: FipeMatchInput, candidate: FipeCandidate): number {
  const tokensModelo = new Set(tokenizeFipe(input.model ?? ""));
  const tokensFipe = tokenizeFipe(candidate.model);

  // Veto: o nome FIPE tem que conter o modelo.
  if (tokensModelo.size === 0) return 0;
  for (const token of tokensModelo) {
    if (!tokensFipe.some((t) => modeloCompativel(token, t))) return 0;
  }

  // Veto: sufixo de família. "COROLLA" não é "COROLLA CROSS"; "ONIX" não é
  // "ONIX PLUS". Sem isso o veto de modelo passa (o token curto está lá) e
  // o desconto FIPE sai do carro errado.
  if (!familiaCompativel(input, tokensFipe)) return 0;

  // Veto: ano-modelo exato.
  if (input.modelYear !== null && input.modelYear !== candidate.modelYear) return 0;

  const tokensAnuncio = tokensDoAnuncio(input, tokensModelo);

  // Veto: cilindrada declarada nos dois lados tem que bater.
  const cilAnuncio = cilindrada(tokensAnuncio);
  const cilFipe = cilindrada(tokensFipe);
  if (cilAnuncio && cilFipe && cilAnuncio !== cilFipe) return 0;

  // Veto: diesel é outro carro.
  if (input.fuelType) {
    const anuncioDiesel = input.fuelType === "DIESEL";
    const fipeDiesel = candidate.fuelType === "DIESEL";
    if (anuncioDiesel !== fipeDiesel) return 0;
  }

  const versaoAnuncio = relevantes(tokensAnuncio, tokensModelo);
  const versaoFipe = relevantes(tokensFipe, tokensModelo);

  // Veto: nome de versão declarado nos dois lados sem uma palavra em comum é
  // outro carro. "1500 Classic Laramie" não é "1500 Rebel", mesmo os dois
  // sendo 5.7 V8 4x4 CD — e era assim que o motor compartilhado empurrava um
  // candidato errado para 0.84.
  const nomesAnuncio = nomesDeVersao(versaoAnuncio);
  const nomesFipe = nomesDeVersao(versaoFipe);
  if (nomesAnuncio.size > 0 && nomesFipe.size > 0 && contarComuns(nomesAnuncio, nomesFipe) === 0) {
    return 0;
  }

  let score = 0.55 + 0.3 * f1(versaoAnuncio, versaoFipe);

  if (cilAnuncio && cilFipe) score += 0.06;
  if (input.fuelType) {
    score += input.fuelType === candidate.fuelType ? 0.05 : -0.05;
  }
  const cambioFipe = cambioDoNome(tokensFipe);
  const cambioAnuncio = classeCambio(input.transmission);
  if (cambioAnuncio && cambioFipe) {
    score += cambioAnuncio === cambioFipe ? 0.04 : -0.12;
  }

  if (input.modelYear === null) score = Math.min(score, TETO_SEM_ANO);
  return Math.max(0, Math.min(1, score));
}

/** Melhores candidatos ordenados por confiança, já sem os vetados. */
export function rankFipeCandidates(
  input: FipeMatchInput,
  candidates: readonly FipeCandidate[],
  limit = 3,
): FipeMatchResult[] {
  const daMarca = input.brand
    ? candidates.filter((c) => brandsCompatible(c.brand, input.brand!))
    : candidates;

  return daMarca
    .map((candidate) => ({ candidate, confidence: scoreFipeCandidate(input, candidate) }))
    .filter((r) => r.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence || a.candidate.fipeCode.localeCompare(b.candidate.fipeCode))
    .slice(0, limit);
}

export type FipeMatchOutcome =
  | { status: "auto"; result: FipeMatchResult }
  | { status: "review"; candidates: FipeMatchResult[] }
  | { status: "none" };

/** Limiares da seção 8 (0.85 automático, 0.60–0.85 revisão) mais a regra de
 * margem: empate técnico entre dois candidatos nunca é automático. */
export function classifyFipeMatch(ranked: readonly FipeMatchResult[]): FipeMatchOutcome {
  const melhor = ranked[0];
  if (!melhor || melhor.confidence < REVIEW_THRESHOLD) return { status: "none" };

  const segundo = ranked[1];
  const empatado = segundo !== undefined && melhor.confidence - segundo.confidence < MARGEM_MINIMA;
  if (melhor.confidence >= AUTO_THRESHOLD && !empatado) return { status: "auto", result: melhor };
  return { status: "review", candidates: [...ranked] };
}

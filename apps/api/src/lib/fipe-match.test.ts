import { describe, expect, it } from "vitest";

import {
  rankFipeCandidates,
  classifyFipeMatch,
  scoreFipeCandidate,
  tokenizeFipe,
  type FipeCandidate,
  type FipeMatchInput,
} from "./fipe-match.js";

/** Nomes reais da tabela FIPE (Parallelum). Modelo, versão, motor,
 * combustível e câmbio vêm numa string só — é isso que o matcher enfrenta. */
function fipe(fipeCode: string, brand: string, model: string, modelYear: number, fuelType: string): FipeCandidate {
  return { fipeCode, brand, model, modelYear, fuelType };
}

const COMPASS_LIMITED = fipe("29:1", "Jeep", "COMPASS LIMITED 1.3 TB 4x2 Flex Aut.", 2023, "FLEX");
const COMPASS_LONGITUDE = fipe("29:2", "Jeep", "COMPASS LONGITUDE 1.3 TB 4x2 Flex Aut.", 2023, "FLEX");
const COMPASS_SERIE_S = fipe("29:3", "Jeep", "COMPASS SERIE S T270 1.3 TB 4x4 Flex Aut.", 2023, "FLEX");
const COMPASS_LIMITED_20D = fipe("29:4", "Jeep", "COMPASS LIMITED 2.0 4x4 TB Diesel Aut.", 2023, "DIESEL");

const HILUX_SRV_AUT = fipe("56:1", "Toyota", "Hilux CD SRV 4x4 2.8 Diesel Aut.", 2024, "DIESEL");
const HILUX_SRV_MEC = fipe("56:2", "Toyota", "Hilux CD SRV 4x4 2.8 Diesel Mec.", 2024, "DIESEL");
const HILUX_SRX = fipe("56:3", "Toyota", "Hilux CD SRX 4x4 2.8 Diesel Aut.", 2024, "DIESEL");

const COROLLA_XEI = fipe("56:10", "Toyota", "Corolla XEi 2.0 Flex 16V Aut.", 2022, "FLEX");
const COROLLA_CROSS_XRE = fipe("56:11", "Toyota", "Corolla Cross XRE 2.0 16V Flex Aut.", 2022, "FLEX");
const COROLLA_CROSS_XRX = fipe("56:12", "Toyota", "Corolla Cross XRX 1.8 16V Hibrido Aut.", 2022, "HIBRIDO");

const ONIX_LT = fipe("23:1", "GM - Chevrolet", "ONIX LT 1.0 12V Flex Aut.", 2023, "FLEX");
const GOL = fipe("59:1", "VW - VolksWagen", "Gol 1.0 Flex 12V 5p", 2020, "FLEX");

function anuncio(over: Partial<FipeMatchInput>): FipeMatchInput {
  return {
    brand: null,
    model: null,
    trim: null,
    normalizedTitle: "",
    modelYear: null,
    fuelType: null,
    transmission: null,
    ...over,
  };
}

describe("tokenizeFipe", () => {
  it("separa cilindrada colada no sufixo do motor", () => {
    expect(tokenizeFipe("SRV D4-D 2.8TDI 16V 4X4 C.D.")).toEqual([
      "SRV", "D4", "D", "2.8", "TDI", "16V", "4X4", "CD",
    ]);
  });

  it("C.D. é cabine dupla, não duas letras", () => {
    expect(tokenizeFipe("LARAMIE 6.7TDI 24V 4X4 C.D.")).toContain("CD");
    expect(tokenizeFipe("2500 LARAM. 6.7 NIGHT ED. TB CD 4x4 Die.")).toContain("CD");
  });

  it("preserva o ponto decimal e derruba o resto da pontuação", () => {
    expect(tokenizeFipe("COMPASS LIMITED 1.3 TB 4x2 Flex Aut.")).toEqual([
      "COMPASS", "LIMITED", "1.3", "TB", "4X2", "FLEX", "AUT.",
    ]);
  });

  it("marca a palavra que a FIPE cortou", () => {
    expect(tokenizeFipe("AIRCROSS F. Pack 1.0 Flex TB 200 Aut.")).toEqual([
      "AIRCROSS", "F.", "PACK", "1.0", "FLEX", "TB", "200", "AUT.",
    ]);
  });

  it("normaliza acento", () => {
    expect(tokenizeFipe("Hibrido Híbrido")).toEqual(["HIBRIDO", "HIBRIDO"]);
  });
});

describe("vetos", () => {
  const candidatos = [COMPASS_LIMITED, COMPASS_LONGITUDE, COMPASS_SERIE_S, COMPASS_LIMITED_20D];

  it("modelo ausente no nome FIPE é veto", () => {
    // "COMMANDER" não aparece em nenhuma linha de Compass.
    const ranked = rankFipeCandidates(
      anuncio({ brand: "JEEP", model: "COMMANDER", trim: "LIMITED 1.3 16V T270", modelYear: 2023, fuelType: "FLEX" }),
      candidatos,
    );
    expect(ranked).toHaveLength(0);
  });

  it("ano diferente é veto, não penalidade", () => {
    const ranked = rankFipeCandidates(
      anuncio({ brand: "JEEP", model: "COMPASS", trim: "LIMITED 1.3 16V T270", modelYear: 2019, fuelType: "FLEX" }),
      candidatos,
    );
    expect(ranked).toHaveLength(0);
    expect(classifyFipeMatch(ranked).status).toBe("none");
  });

  it("cilindrada diferente é veto — 1.3 nunca vira 2.0", () => {
    const score = scoreFipeCandidate(
      anuncio({ brand: "JEEP", model: "COMPASS", trim: "LIMITED 1.3 16V T270", modelYear: 2023, fuelType: "FLEX" }),
      COMPASS_LIMITED_20D,
    );
    expect(score).toBe(0);
  });

  it("diesel não casa com flex", () => {
    const score = scoreFipeCandidate(
      anuncio({ brand: "JEEP", model: "COMPASS", trim: "LIMITED 2.0 16V", modelYear: 2023, fuelType: "FLEX" }),
      COMPASS_LIMITED_20D,
    );
    expect(score).toBe(0);
  });

  it("marca incompatível não entra no ranking", () => {
    const ranked = rankFipeCandidates(
      anuncio({ brand: "JEEP", model: "COMPASS", modelYear: 2023, normalizedTitle: "JEEP COMPASS" }),
      [GOL, ONIX_LT],
    );
    expect(ranked).toHaveLength(0);
  });
});

describe("escolha da versão", () => {
  const candidatos = [COMPASS_LIMITED, COMPASS_LONGITUDE, COMPASS_SERIE_S, COMPASS_LIMITED_20D];

  it("Compass Limited 1.3 casa com a linha Limited, não com a Longitude", () => {
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "JEEP", model: "COMPASS", trim: "LIMITED 1.3 16V T270",
        modelYear: 2023, fuelType: "FLEX", transmission: "AUTOMATICO",
      }),
      candidatos,
    );
    const outcome = classifyFipeMatch(ranked);
    expect(outcome.status).toBe("auto");
    if (outcome.status === "auto") {
      expect(outcome.result.candidate.fipeCode).toBe(COMPASS_LIMITED.fipeCode);
    }
  });

  it("T270 no anúncio não decide nada — é código comercial de motor", () => {
    const comCodigo = scoreFipeCandidate(
      anuncio({ brand: "JEEP", model: "COMPASS", trim: "LIMITED 1.3 16V T270", modelYear: 2023, fuelType: "FLEX" }),
      COMPASS_LIMITED,
    );
    const semCodigo = scoreFipeCandidate(
      anuncio({ brand: "JEEP", model: "COMPASS", trim: "LIMITED 1.3 16V", modelYear: 2023, fuelType: "FLEX" }),
      COMPASS_LIMITED,
    );
    expect(comCodigo).toBeCloseTo(semCodigo, 10);
  });

  it("câmbio desempata linhas FIPE idênticas fora dele", () => {
    const candidatos = [HILUX_SRV_AUT, HILUX_SRV_MEC, HILUX_SRX];
    const automatico = rankFipeCandidates(
      anuncio({
        brand: "TOYOTA", model: "HILUX", trim: "SRV D4-D 2.8TDI 16V 4X4 C.D.",
        modelYear: 2024, fuelType: "DIESEL", transmission: "AUTOMATICO",
      }),
      candidatos,
    );
    expect(automatico[0]?.candidate.fipeCode).toBe(HILUX_SRV_AUT.fipeCode);

    const manual = rankFipeCandidates(
      anuncio({
        brand: "TOYOTA", model: "HILUX", trim: "SRV D4-D 2.8TDI 16V 4X4 C.D.",
        modelYear: 2024, fuelType: "DIESEL", transmission: "MANUAL",
      }),
      candidatos,
    );
    expect(manual[0]?.candidate.fipeCode).toBe(HILUX_SRV_MEC.fipeCode);
  });

  it("SRV não vira SRX", () => {
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "TOYOTA", model: "HILUX", trim: "SRV D4-D 2.8TDI 16V 4X4 C.D.",
        modelYear: 2024, fuelType: "DIESEL", transmission: "AUTOMATICO",
      }),
      [HILUX_SRX, HILUX_SRV_AUT],
    );
    expect(ranked[0]?.candidate.fipeCode).toBe(HILUX_SRV_AUT.fipeCode);
    expect(classifyFipeMatch(ranked).status).toBe("auto");
  });

  it("Corolla Cross não casa com linha de Corolla comum", () => {
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "TOYOTA", model: "COROLLA CROSS", trim: "XRE 2.0 16V",
        modelYear: 2022, fuelType: "FLEX", transmission: "AUTOMATICO",
      }),
      [COROLLA_XEI, COROLLA_CROSS_XRE, COROLLA_CROSS_XRX],
    );
    expect(ranked.map((r) => r.candidate.fipeCode)).not.toContain(COROLLA_XEI.fipeCode);
    expect(ranked[0]?.candidate.fipeCode).toBe(COROLLA_CROSS_XRE.fipeCode);
  });

  it("Corolla sedan não casa com linha de Corolla Cross", () => {
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "TOYOTA", model: "COROLLA", trim: "XEI 2.0 16V",
        normalizedTitle: "TOYOTA COROLLA XEI 2.0 16V",
        modelYear: 2022, fuelType: "FLEX", transmission: "AUTOMATICO",
      }),
      [COROLLA_XEI, COROLLA_CROSS_XRE],
    );
    expect(ranked.map((r) => r.candidate.fipeCode)).not.toContain(COROLLA_CROSS_XRE.fipeCode);
    expect(ranked[0]?.candidate.fipeCode).toBe(COROLLA_XEI.fipeCode);
  });

  it("CHEVROLET do anúncio casa com GM - Chevrolet da FIPE", () => {
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "CHEVROLET", model: "ONIX", trim: "LT 1.0T 12V",
        modelYear: 2023, fuelType: "FLEX", transmission: "AUTOMATICO",
      }),
      [ONIX_LT, GOL],
    );
    expect(ranked[0]?.candidate.fipeCode).toBe(ONIX_LT.fipeCode);
  });
});

describe("classifyFipeMatch", () => {
  it("anúncio sem versão fica em revisão em vez de escolher no chute", () => {
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "JEEP", model: "COMPASS", trim: null,
        normalizedTitle: "JEEP COMPASS", modelYear: 2023, fuelType: "FLEX",
      }),
      [COMPASS_LIMITED, COMPASS_LONGITUDE],
    );
    const outcome = classifyFipeMatch(ranked);
    expect(outcome.status).toBe("review");
    if (outcome.status === "review") expect(outcome.candidates.length).toBe(2);
  });

  it("empate técnico entre dois candidatos nunca é automático", () => {
    const gemeo = { ...COMPASS_LIMITED, fipeCode: "29:9" };
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "JEEP", model: "COMPASS", trim: "LIMITED 1.3 16V",
        modelYear: 2023, fuelType: "FLEX", transmission: "AUTOMATICO",
      }),
      [COMPASS_LIMITED, gemeo],
    );
    expect(ranked[0]!.confidence).toBeGreaterThanOrEqual(0.85);
    expect(classifyFipeMatch(ranked).status).toBe("review");
  });

  it("sem ano-modelo o match nunca é automático", () => {
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "JEEP", model: "COMPASS", trim: "LIMITED 1.3 16V",
        modelYear: null, fuelType: "FLEX", transmission: "AUTOMATICO",
      }),
      [COMPASS_LIMITED],
    );
    expect(classifyFipeMatch(ranked).status).toBe("review");
  });

  it("lista vazia é none", () => {
    expect(classifyFipeMatch([]).status).toBe("none");
  });
});

describe("abreviação e nome de versão (casos reais da RAM)", () => {
  const RAM_1500_REBEL = fipe("185:1", "RAM", "1500 REBEL 5.7 HEMI CD V8 4x4 Aut.", 2023, "GASOLINA");
  const RAM_1500_LIMITED = fipe("185:2", "RAM", "1500 LIMITED 5.7 CD 4x4 Aut.", 2023, "GASOLINA");
  const RAM_2500_LARAMIE = fipe("185:3", "RAM", "2500 LARAMIE  6.7 TDI  CD 4x4 Diesel", 2024, "DIESEL");
  const RAM_2500_NIGHT = fipe("185:4", "RAM", "2500 LARAM. 6.7 NIGHT ED. TB CD 4x4 Die.", 2024, "DIESEL");
  const RAM_2500_RODEO = fipe("185:5", "RAM", "2500 LARAM. 6.7 RODEO ED. TB CD 4x4 Die.", 2024, "DIESEL");

  it("Classic Laramie não casa com Rebel nem Limited, mesmo compartilhando 5.7 V8 4x4 CD", () => {
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "RAM", model: "1500", trim: "CLASSIC LARAMIE 5.7 V8 4X4 C.D.",
        modelYear: 2023, fuelType: "GASOLINA", transmission: "AUTOMATICO",
      }),
      [RAM_1500_REBEL, RAM_1500_LIMITED],
    );
    expect(ranked).toHaveLength(0);
    expect(classifyFipeMatch(ranked).status).toBe("none");
  });

  it('"LARAM. 6.7 NIGHT ED." casa com "LARAMIE NIGHT EDITION" do anúncio', () => {
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "RAM", model: "2500", trim: "LARAMIE NIGHT EDITION 6.7TDI 24V 4X4 C.D.",
        modelYear: 2024, fuelType: "DIESEL", transmission: "AUTOMATICO",
      }),
      [RAM_2500_LARAMIE, RAM_2500_NIGHT, RAM_2500_RODEO],
    );
    const outcome = classifyFipeMatch(ranked);
    expect(outcome.status).toBe("auto");
    if (outcome.status === "auto") {
      expect(outcome.result.candidate.fipeCode).toBe(RAM_2500_NIGHT.fipeCode);
    }
  });

  it("Laramie sem Night Edition casa com a linha Laramie pura", () => {
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "RAM", model: "2500", trim: "LARAMIE 6.7TDI 24V 4X4 C.D.",
        modelYear: 2024, fuelType: "DIESEL", transmission: "AUTOMATICO",
      }),
      [RAM_2500_LARAMIE, RAM_2500_NIGHT, RAM_2500_RODEO],
    );
    const outcome = classifyFipeMatch(ranked);
    expect(outcome.status).toBe("auto");
    if (outcome.status === "auto") {
      expect(outcome.result.candidate.fipeCode).toBe(RAM_2500_LARAMIE.fipeCode);
    }
  });

  it("LT não vira LTZ — abreviação de 2 letras não casa por prefixo", () => {
    const lt = fipe("23:1", "GM - Chevrolet", "TRACKER LT 1.0 TB 12V Flex Aut.", 2023, "FLEX");
    const ltz = fipe("23:2", "GM - Chevrolet", "TRACKER LTZ 1.0 TB 12V Flex Aut.", 2023, "FLEX");
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "CHEVROLET", model: "TRACKER", trim: "LTZ 1.0T 12V",
        modelYear: 2023, fuelType: "FLEX", transmission: "AUTOMATICO",
      }),
      [lt, ltz],
    );
    expect(ranked[0]?.candidate.fipeCode).toBe(ltz.fipeCode);
    expect(classifyFipeMatch(ranked).status).toBe("auto");
  });

  it("versão só com especificação de motor não dispara o veto de nome", () => {
    const gol = fipe("59:1", "VW - VolksWagen", "Gol 1.0 Flex 12V 5p", 2020, "FLEX");
    const score = scoreFipeCandidate(
      anuncio({
        brand: "VOLKSWAGEN", model: "GOL", trim: "1.0 12V",
        modelYear: 2020, fuelType: "FLEX", transmission: "MANUAL",
      }),
      gol,
    );
    expect(score).toBeGreaterThan(0.85);
  });
});

/** Todos os casos abaixo são linhas reais da FIPE contra anúncios reais do
 * Shopcar que estavam caindo em revisão (ou em nada) sem motivo. */
describe("casos reais que estavam falhando", () => {
  it('"320i GP" casa com "320iA" — a FIPE cola a letra de câmbio no modelo', () => {
    const gp = fipe("7:1", "BMW", "320iA 2.0 Turbo/ActiveFlex 16V/GP  4p", 2021, "GASOLINA");
    const modern = fipe("7:2", "BMW", "320iA Modern/Sport TB 2.0/A.Flex/GP 4p", 2021, "GASOLINA");
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "BMW", model: "320I", trim: "GP 2.0T 16V",
        modelYear: 2021, fuelType: "GASOLINA", transmission: "AUTOMATICO",
      }),
      [gp, modern],
    );
    const outcome = classifyFipeMatch(ranked);
    expect(outcome.status).toBe("auto");
    if (outcome.status === "auto") expect(outcome.result.candidate.fipeCode).toBe(gp.fipeCode);
  });

  it('"Feel Pack" prefere "F. Pack" a "Feel" puro', () => {
    const feel = fipe("13:1", "Citroën", "AIRCROSS Feel 1.0 Flex Turbo 200 Aut.", 2024, "FLEX");
    const feelPack = fipe("13:2", "Citroën", "AIRCROSS F. Pack 1.0 Flex TB 200 Aut.", 2024, "FLEX");
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "CITROEN", model: "AIRCROSS", trim: "FEEL PACK 1.0T 12V",
        modelYear: 2024, fuelType: "FLEX", transmission: "AUTOMATICO",
      }),
      [feel, feelPack],
    );
    const outcome = classifyFipeMatch(ranked);
    expect(outcome.status).toBe("auto");
    if (outcome.status === "auto") expect(outcome.result.candidate.fipeCode).toBe(feelPack.fipeCode);
  });

  it("S-tronic da FIPE e automatizado do anúncio são o mesmo câmbio", () => {
    const ambition = fipe("6:1", "Audi", "A3 Sed. Ambition 2.0 TSFI 220cv S-tronic", 2016, "GASOLINA");
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "AUDI", model: "A3", trim: "SEDAN AMBITION 2.0 TFSI 16V",
        modelYear: 2016, fuelType: "GASOLINA", transmission: "AUTOMATIZADO",
      }),
      [ambition],
    );
    expect(classifyFipeMatch(ranked).status).toBe("auto");
  });

  it('"Hatch" do anúncio não conta contra a linha FIPE que não usa carroceria', () => {
    const exclusive = fipe("13:3", "Citroën", "C3 Exclusive 1.4 Flex 8V 5p", 2012, "FLEX");
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "CITROEN", model: "C3", trim: "HATCH EXCLUSIVE 1.4",
        modelYear: 2012, fuelType: "FLEX", transmission: "MANUAL",
      }),
      [exclusive],
    );
    expect(classifyFipeMatch(ranked).status).toBe("auto");
  });

  it("modelo com número no nome casa inteiro (Arrizo 6, não Arrizo 5)", () => {
    const arrizo6 = fipe("245:1", "Caoa Chery", "Arrizo 6 GSX 1.5 TB 16V Flex Aut.", 2022, "FLEX");
    const arrizo5 = fipe("245:2", "Caoa Chery", "Arrizo 5 RX 1.5 TB 16V Flex Aut.", 2022, "FLEX");
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "CAOA CHERY", model: "ARRIZO 6", trim: "GSX 1.5T 16V",
        modelYear: 2022, fuelType: "FLEX", transmission: "AUTOMATICO",
      }),
      [arrizo6, arrizo5],
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.candidate.fipeCode).toBe(arrizo6.fipeCode);
  });

  it('Mercedes "A 200" não casa com "A 250"', () => {
    const a200 = fipe("39:1", "Mercedes-Benz", "A 200 Urban 1.6 TB 16V Aut.", 2013, "GASOLINA");
    const a250 = fipe("39:2", "Mercedes-Benz", "A 250 Sport 2.0 TB 16V Aut.", 2013, "GASOLINA");
    const ranked = rankFipeCandidates(
      anuncio({
        brand: "MERCEDES-BENZ", model: "A 200", trim: "URBAN 1.6T 16V",
        modelYear: 2013, fuelType: "GASOLINA", transmission: "AUTOMATIZADO",
      }),
      [a200, a250],
    );
    expect(ranked).toHaveLength(1);
    expect(classifyFipeMatch(ranked).status).toBe("auto");
    expect(ranked[0]!.candidate.fipeCode).toBe(a200.fipeCode);
  });
});

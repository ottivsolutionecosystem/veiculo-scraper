import { describe, expect, it } from "vitest";

import { apiBrasilValorToCents, mapApiBrasilFipeResponse } from "./plate-lookup.js";

describe("plate-lookup APIBrasil", () => {
  it("converte valor em reais para centavos", () => {
    expect(apiBrasilValorToCents(102385)).toBe(10_238_500);
    expect(apiBrasilValorToCents("R$ 102.385,00")).toBe(10_238_500);
  });

  it("mapeia candidatos FIPE e marca o principal", () => {
    const result = mapApiBrasilFipeResponse("ABC1D23", {
      error: false,
      data: {
        confianca: "baixa",
        data: [
          {
            codigoFipe: "005510-7",
            marca: "VW - VolksWagen",
            modelo: "T-Cross 200 TSI",
            anoModelo: "2024",
            combustivel: "flex",
            mesReferencia: "novembro de 2026",
            valor: 102385,
            principal: true,
            categoria: "carro",
          },
          {
            codigoFipe: "005509-3",
            marca: "VW - VolksWagen",
            modelo: "T-Cross Comfort",
            anoModelo: 2024,
            combustivel: "flex",
            mesReferencia: "novembro de 2026",
            valor: 113184,
            principal: false,
            categoria: "carro",
          },
        ],
        veiculo: { cor: "PRATA" },
      },
    });

    expect(result.color).toBe("PRATA");
    expect(result.confidence).toBe("baixa");
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]?.principal).toBe(true);
    expect(result.candidates[0]?.priceCents).toBe(10_238_500);
    expect(result.candidates[0]?.brand).toBe("VW VolksWagen");
    expect(result.candidates[0]?.vehicleType).toBe("carros");
  });

  it("rejeita envelope com error=true", () => {
    expect(() =>
      mapApiBrasilFipeResponse("ABC1D23", { error: true, message: "Placa inválida." }),
    ).toThrow(/Placa inválida/);
  });
});

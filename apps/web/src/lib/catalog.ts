/**
 * Vocabulário de marca/modelo compartilhado com
 * services/collector/captacao_bot/normalize.py (MODELO_PARA_MARCA), para os
 * mocks usarem os mesmos nomes que o coletor real produz.
 */
export const MODELS_BY_BRAND: Record<string, string[]> = {
  VOLKSWAGEN: ["GOL", "POLO", "VIRTUS", "T-CROSS", "NIVUS", "SAVEIRO", "VOYAGE", "JETTA"],
  CHEVROLET: ["ONIX", "PRISMA", "TRACKER", "S10", "CRUZE", "SPIN", "MONTANA"],
  FIAT: ["STRADA", "TORO", "ARGO", "MOBI", "CRONOS", "PULSE", "UNO", "PALIO", "FASTBACK"],
  FORD: ["KA", "RANGER", "ECOSPORT", "FIESTA"],
  TOYOTA: ["COROLLA", "HILUX", "YARIS", "COROLLA CROSS", "ETIOS", "SW4"],
  HONDA: ["CIVIC", "HR-V", "FIT", "CITY", "WR-V"],
  HYUNDAI: ["HB20", "CRETA", "TUCSON"],
  RENAULT: ["KWID", "SANDERO", "DUSTER", "LOGAN", "OROCH"],
  NISSAN: ["KICKS", "FRONTIER", "VERSA"],
  JEEP: ["COMPASS", "RENEGADE", "COMMANDER"],
  MITSUBISHI: ["L200", "PAJERO"],
};

export const BRANDS = Object.keys(MODELS_BY_BRAND);

export const CITIES: { city: string; state: string }[] = [
  { city: "Campo Grande", state: "MS" },
  { city: "Dourados", state: "MS" },
  { city: "Três Lagoas", state: "MS" },
  { city: "Corumbá", state: "MS" },
  { city: "Ponta Porã", state: "MS" },
  { city: "São Paulo", state: "SP" },
  { city: "Curitiba", state: "PR" },
  { city: "Cuiabá", state: "MT" },
];

export const COLORS = ["BRANCO", "PRATA", "PRETO", "CINZA", "VERMELHO", "AZUL"];

export const TRANSMISSIONS = ["MANUAL", "AUTOMATICO", "AUTOMATIZADO"] as const;
export const FUEL_TYPES = ["FLEX", "GASOLINA", "DIESEL", "HIBRIDO"] as const;

export const SOURCES = ["shopcar", "webmotors", "olx"] as const;

export const SELLER_NAMES = [
  "Revenda Show de Carros", "Auto Show Multimarcas", "Carlos Eduardo Silva",
  "João Batista Pereira", "Multicar Veículos", "Maria Aparecida Souza",
  "Garagem do Zé", "Roberto Nunes", "Auto Pátio MS", "Fernanda Lima",
  "Troca Fácil Veículos", "Antônio Carlos Ramos", "Bela Vista Automóveis",
  "Paulo Henrique Costa", "Rota 262 Veículos", "Sandra Regina Alves",
  "Marcos Vinícius Teixeira", "Vitrine Automotiva Dourados", "Lucas Gabriel Martins",
  "Auto Elite Pantanal", "Renata Cristina Gomes", "Diego Fernandes",
  "Garagem Central", "José Roberto Dias", "Multimarcas Sul",
  "Ana Paula Rodrigues", "Big Motors MS", "Eduardo Barbosa",
  "Feirão do Cerrado", "Cláudio Roberto Lima", "Vitória Automóveis",
  "Ricardo Almeida", "Show Room Veículos", "Patrícia Nogueira",
  "Auto Negócios MS", "Bruno Cesar Farias", "Central de Veículos Dourados",
  "Simone Cristina Rocha", "Kaique Vitor Moreira", "Garagem Boa Vista",
  "Tiago Henrique Batista", "Multicenter Automóveis", "Camila Fernandes Souza",
] as const;

export const DISCARD_REASONS = [
  "Preço fora da faixa",
  "Vendedor sem resposta",
  "Veículo já vendido",
  "Sinistro declarado",
  "Documentação irregular",
  "Duplicidade confirmada",
];

/**
 * Fornecedor externo atrás de interface (mesma convenção de
 * TelephonyProvider/MessagingProvider do CLAUDE.md) — a ingestão FIPE
 * (SPEC seção 8) não conhece qual API está por trás, só este contrato.
 *
 * A escolha de QUAL provedor usar em produção (chave, custo, rate limit)
 * não foi feita aqui — é decisão de negócio, não técnica, e este ambiente
 * de execução não tem egress de rede liberado pra nenhuma API externa
 * (testado contra parallelum/fipe.parallelum e bloqueado pela política de
 * rede da sandbox). RELATORIO.md registra isso como pendência.
 */

export interface FipeProviderBrand {
  code: string;
  name: string;
}

export interface FipeProviderModel {
  code: string;
  name: string;
}

export interface FipeProviderYear {
  code: string; // ano_modelo + combustível, formato do provedor
  modelYear: number;
  fuelType: string;
}

export interface FipeProviderPrice {
  valueCents: number;
  referenceMonth: string; // "2026-07"
}

export interface FipeProvider {
  listBrands(): Promise<FipeProviderBrand[]>;
  listModels(brandCode: string): Promise<FipeProviderModel[]>;
  listYears(brandCode: string, modelCode: string): Promise<FipeProviderYear[]>;
  getPrice(brandCode: string, modelCode: string, yearCode: string): Promise<FipeProviderPrice>;
}

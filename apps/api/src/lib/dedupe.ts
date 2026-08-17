/**
 * Política de merge do dedupe — não a fingerprint em si.
 *
 * A fingerprint (marca+modelo+ano_modelo+faixa_km+cor+cidade) já é
 * calculada e testada no coletor Python (`pipeline.fingerprint`,
 * `test_adapter_e_runner.py::TestFingerprint`) antes do anúncio chegar em
 * `anuncios.fingerprint`. Recalculá-la aqui em TS seria duplicar a mesma
 * regra em duas linguagens sem ganhar confiança — o worker só lê o valor
 * que o Postgres já tem via `UNIQUE (fingerprint)` em `veiculos`.
 *
 * O que sobra pra decidir do lado do worker: quando dois+ anúncios caem
 * na mesma fingerprint, qual deles vira `anuncio_principal` — é essa a
 * regra testada aqui.
 */

export interface AnuncioCandidate {
  id: number;
  pendingFieldsCount: number;
  lastSeenAt: string; // ISO
}

/**
 * Anúncio mais completo (menos pendências) vence. Empate: o visto mais
 * recentemente — é o que tem preço/foto mais atual. Empate total: menor
 * id, só pra ser determinístico (não deveria acontecer na prática).
 */
export function chooseAnuncioPrincipal(candidates: readonly AnuncioCandidate[]): AnuncioCandidate {
  if (candidates.length === 0) {
    throw new Error("chooseAnuncioPrincipal: lista vazia");
  }

  return [...candidates].sort((a, b) => {
    if (a.pendingFieldsCount !== b.pendingFieldsCount) {
      return a.pendingFieldsCount - b.pendingFieldsCount;
    }
    const dateDiff = new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.id - b.id;
  })[0]!;
}

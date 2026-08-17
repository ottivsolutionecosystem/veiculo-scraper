import type { PoolClient } from "pg";

import { chooseAnuncioPrincipal, type AnuncioCandidate } from "../lib/dedupe.js";

/**
 * Job `normalize` (SPEC seção 5): promove um anúncio recém-gravado pelo
 * coletor (fingerprint já calculada em Python) a veículo canônico —
 * agrega a um veículo existente com a mesma fingerprint ou cria um novo.
 * A fingerprint em si não é recalculada aqui (ver lib/dedupe.ts).
 */
export async function normalizeAnuncio(client: PoolClient, anuncioId: number): Promise<{ veiculoId: number; created: boolean }> {
  const { rows: anuncioRows } = await client.query(
    "SELECT id, fingerprint, pendencias, ultima_vista_em FROM anuncios WHERE id = $1",
    [anuncioId],
  );
  const anuncio = anuncioRows[0];
  if (!anuncio) throw new Error(`normalize: anúncio ${anuncioId} não encontrado`);

  const { rows: existingRows } = await client.query("SELECT id FROM veiculos WHERE fingerprint = $1", [
    anuncio.fingerprint,
  ]);
  const existing = existingRows[0];

  if (!existing) {
    const { rows } = await client.query(
      "INSERT INTO veiculos (fingerprint, anuncio_principal_id) VALUES ($1, $2) RETURNING id",
      [anuncio.fingerprint, anuncioId],
    );
    const veiculoId = rows[0]!.id as number;
    await client.query("INSERT INTO anuncio_veiculo (anuncio_id, veiculo_id) VALUES ($1, $2)", [anuncioId, veiculoId]);
    await client.query(
      "INSERT INTO estados_veiculo (veiculo_id, estado, autor) VALUES ($1, 'new', 'worker:normalize')",
      [veiculoId],
    );
    return { veiculoId, created: true };
  }

  const veiculoId = existing.id as number;
  await client.query(
    "INSERT INTO anuncio_veiculo (anuncio_id, veiculo_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [anuncioId, veiculoId],
  );

  // Recalcula qual anúncio é o principal entre todos os ligados.
  const { rows: linkedRows } = await client.query(
    `SELECT a.id, array_length(a.pendencias, 1) AS pend, a.ultima_vista_em FROM anuncios a
       JOIN anuncio_veiculo av ON av.anuncio_id = a.id
      WHERE av.veiculo_id = $1`,
    [veiculoId],
  );
  const candidates: AnuncioCandidate[] = linkedRows.map((r) => ({
    id: r.id,
    pendingFieldsCount: r.pend ?? 0,
    lastSeenAt: r.ultima_vista_em,
  }));
  const principal = chooseAnuncioPrincipal(candidates);
  await client.query("UPDATE veiculos SET anuncio_principal_id = $2, atualizado_em = now() WHERE id = $1", [
    veiculoId,
    principal.id,
  ]);

  return { veiculoId, created: false };
}

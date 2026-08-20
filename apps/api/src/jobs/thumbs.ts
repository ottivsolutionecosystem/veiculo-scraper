/**
 * Job `thumbs` (SPEC seção 14). Sem storage de objetos definido, o worker
 * não gera arquivo — e também não quebra a fila se alguém enfileirar o job.
 */
export async function generateThumbnails(_anuncioId: number): Promise<void> {
  return;
}

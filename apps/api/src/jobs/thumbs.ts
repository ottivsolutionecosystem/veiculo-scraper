/**
 * Job `thumbs` (SPEC seção 14: "thumbnails WebP em 3 tamanhos gerados no
 * worker"). Fora de escopo desta fase — processamento de imagem (sharp/
 * libvips, upload pro storage de objetos) é uma dependência pesada nova
 * que precisa de decisão sobre onde os arquivos ficam guardados (S3? disco
 * local? CLAUDE.md pede justificar dependência pesada no RELATORIO.md, e
 * "onde fica o storage de objetos" é decisão de infra que só o usuário
 * tem). O job fica registrado na fila (worker.ts) apontando pra este stub,
 * pronto pra receber a implementação real sem mexer no resto do pipeline.
 */
export async function generateThumbnails(anuncioId: number): Promise<void> {
  throw new Error(
    `thumbs: não implementado (veja src/jobs/thumbs.ts) — anuncio_id=${anuncioId}`,
  );
}

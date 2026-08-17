import { Queue, Worker, type ConnectionOptions } from "bullmq";

import { env } from "./env.js";
import { pool } from "./db.js";
import { normalizeAnuncio } from "./jobs/normalize.js";
import { matchFipeForVehicle } from "./jobs/match-fipe.js";
import { calculateScoreForVehicle } from "./jobs/score.js";
import { matchInterestsForVehicle } from "./jobs/match-interesse.js";
import { notifyWebhooks } from "./jobs/notify.js";
import { generateThumbnails } from "./jobs/thumbs.js";

/**
 * Worker BullMQ (SPEC seção 5). Filas: normalize, match:fipe, dedupe,
 * score, thumbs, match:interesse, notify. `dedupe` está fundida no
 * processor de `normalize` — a escolha de anuncio_principal acontece no
 * mesmo passo que liga o anúncio ao veículo (mesma transação lógica);
 * manter fila própria só adicionaria um hop assíncrono sem ganho, então
 * o nome existe na fila só por paridade com o SPEC, e o processor delega
 * pro mesmo código.
 */
const connection: ConnectionOptions = { url: env.redisUrl } as unknown as ConnectionOptions;

// BullMQ usa ":" como separador interno de chave Redis — nomes de fila não
// podem conter ":". "match:fipe"/"match:interesse" (nomenclatura do SPEC,
// seção 5) viram "match-fipe"/"match-interesse" nos nomes reais de fila.
export const queues = {
  normalize: new Queue("normalize", { connection }),
  matchFipe: new Queue("match-fipe", { connection }),
  dedupe: new Queue("dedupe", { connection }),
  score: new Queue("score", { connection }),
  thumbs: new Queue("thumbs", { connection }),
  matchInterest: new Queue("match-interesse", { connection }),
  notify: new Queue("notify", { connection }),
};

async function withClient<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export function startWorkers() {
  const normalizeWorker = new Worker(
    "normalize",
    async (job) => {
      const { veiculoId } = await withClient((client) => normalizeAnuncio(client, job.data.anuncioId));
      await queues.matchFipe.add("match", { veiculoId });
      return { veiculoId };
    },
    { connection },
  );

  const matchFipeWorker = new Worker(
    "match-fipe",
    async (job) => {
      await withClient((client) => matchFipeForVehicle(client, job.data.veiculoId));
      await queues.score.add("calc", { veiculoId: job.data.veiculoId });
      await queues.matchInterest.add("match", { veiculoId: job.data.veiculoId });
    },
    { connection },
  );

  const scoreWorker = new Worker(
    "score",
    async (job) => withClient((client) => calculateScoreForVehicle(client, job.data.veiculoId)),
    { connection },
  );

  const matchInterestWorker = new Worker(
    "match-interesse",
    async (job) => withClient((client) => matchInterestsForVehicle(client, job.data.veiculoId)),
    { connection },
  );

  const notifyWorker = new Worker(
    "notify",
    async (job) => withClient((client) => notifyWebhooks(client, job.data.event, job.data.payload)),
    { connection, attempts: 3, backoff: { type: "exponential", delay: 5000 } } as ConstructorParameters<typeof Worker>[2],
  );

  const thumbsWorker = new Worker("thumbs", async (job) => generateThumbnails(job.data.anuncioId), { connection });

  const dedupeWorker = new Worker(
    "dedupe",
    async (job) => withClient((client) => normalizeAnuncio(client, job.data.anuncioId)),
    { connection },
  );

  return [normalizeWorker, matchFipeWorker, scoreWorker, matchInterestWorker, notifyWorker, thumbsWorker, dedupeWorker];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const workers = startWorkers();
  console.log(`worker rodando, ${workers.length} filas registradas`);
}

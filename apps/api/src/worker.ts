import { Queue, Worker, type ConnectionOptions } from "bullmq";

import { env } from "./env.js";
import { isMainModule } from "./lib/is-main.js";
import { pool, refreshFilaDoDia, refreshFilaDoDiaAsync } from "./db.js";
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
// BullMQ usa comandos bloqueantes — maxRetriesPerRequest precisa ser null no ioredis.
const connection: ConnectionOptions = {
  url: env.redisUrl,
  maxRetriesPerRequest: null,
} as unknown as ConnectionOptions;

function wireWorkerLogs(worker: Worker, nome: string) {
  worker.on("failed", (job, err) => {
    console.error(`worker ${nome} job ${job?.id ?? "?"} falhou:`, err);
  });
  worker.on("error", (err) => {
    console.error(`worker ${nome} erro de conexão/redis:`, err);
  });
}

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
  refreshFila: new Queue("refresh-fila", { connection }),
  ingest: new Queue("ingest", { connection }),
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
    async (job) => {
      await withClient((client) => calculateScoreForVehicle(client, job.data.veiculoId));
      refreshFilaDoDia();
    },
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

  const refreshFilaWorker = new Worker("refresh-fila", async () => refreshFilaDoDiaAsync(), { connection });

  // O coletor só grava em `anuncios` (fronteira = Postgres). Este job puxa
  // anúncios ainda sem veículo e enfileira normalize — sem RPC TS↔Python.
  const ingestWorker = new Worker(
    "ingest",
    async () => {
      const { rows } = await pool.query<{ id: number }>(
        `SELECT a.id FROM anuncios a
           LEFT JOIN anuncio_veiculo av ON av.anuncio_id = a.id
          WHERE av.anuncio_id IS NULL
          ORDER BY a.id
          LIMIT 200`,
      );
      for (const row of rows) {
        // jobId estável + Redis depois de TRUNCATE faz o ingest achar que o
        // anúncio 1, 2, 3… já foi promovido. removeOnComplete/Fail deixa o
        // id livre na próxima coleta; o catch cobre o lixo que já está lá.
        try {
          await queues.normalize.add(
            "normalize",
            { anuncioId: row.id },
            { jobId: `anuncio-${row.id}`, removeOnComplete: true, removeOnFail: true },
          );
        } catch {
          await queues.normalize.add("normalize", { anuncioId: row.id }, { removeOnComplete: true });
        }
      }

      // Preço mudou no anúncio já ligado: o desconto FIPE foi calculado no
      // match antigo e fica mentindo até refazer. JobId por minuto evita
      // enfileirar o mesmo veículo a cada scan de 15s.
      const { rows: priceRows } = await pool.query<{ veiculo_id: number }>(
        `SELECT DISTINCT av.veiculo_id
           FROM preco_historico ph
           JOIN anuncio_veiculo av ON av.anuncio_id = ph.anuncio_id
          WHERE ph.observado_em > now() - interval '3 minutes'
          LIMIT 30`,
      );
      const minuto = Math.floor(Date.now() / 60_000);
      for (const row of priceRows) {
        await queues.matchFipe.add(
          "match",
          { veiculoId: row.veiculo_id },
          { jobId: `fipe-preco-${row.veiculo_id}-${minuto}`, removeOnComplete: true },
        );
      }

      const { rows: dirtyRows } = await pool.query<{ precisa: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM execucoes_solicitadas WHERE processado_em IS NULL
         ) OR EXISTS (
           SELECT 1 FROM scrape_runs WHERE finalizado_em > now() - interval '3 minutes'
         ) AS precisa`,
      );
      if (rows.length > 0 || priceRows.length > 0 || dirtyRows[0]?.precisa) {
        await refreshFilaDoDiaAsync();
      }
      if (rows.length > 0) {
        console.log(`ingest: ${rows.length} normalize(s) enfileirado(s)`);
      }
      return { enqueued: rows.length, rematch: priceRows.length };
    },
    { connection },
  );

  const workers = [
    normalizeWorker,
    matchFipeWorker,
    scoreWorker,
    matchInterestWorker,
    notifyWorker,
    thumbsWorker,
    dedupeWorker,
    refreshFilaWorker,
    ingestWorker,
  ];
  for (const w of workers) {
    wireWorkerLogs(w, w.name);
  }

  // fila_do_dia é materializada — refresh a cada 10 min (db/migrations/0011).
  // Descarte e resultado de ligação também disparam refresh direto (db.ts).
  void queues.refreshFila.add("refresh", {}, { repeat: { every: 10 * 60 * 1000 }, removeOnComplete: true });
  void queues.ingest.add("scan", {}, { repeat: { every: 15_000 }, removeOnComplete: true });

  return workers;
}

if (isMainModule(import.meta.url)) {
  const workers = startWorkers();
  console.log(`worker rodando, ${workers.length} filas registradas`);
}

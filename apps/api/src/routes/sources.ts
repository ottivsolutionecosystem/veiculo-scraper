import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
import { ForbiddenError, NotFoundError } from "../lib/http-errors.js";

const patchBody = z.object({ active: z.boolean() });
const runsQuery = z.object({ cursor: z.string().optional(), limit: z.string().optional() });

// Só shopcar tem self-service de liga/desliga — webmotors/olx nascem
// desligadas por decisão de projeto (CLAUDE.md) e só mudam por
// homologação/config manual, nunca pela API.
const SELF_SERVICE_SOURCES = new Set(["shopcar"]);

/** GET/PATCH /api/sources* — Fontes (docs/API.md seção 9). */
export async function sourceRoutes(app: FastifyInstance) {
  app.get("/api/sources", async (_req, reply) => {
    const { rows: sources } = await pool.query("SELECT * FROM fontes ORDER BY fonte");
    for (const source of sources) {
      const { rows: lastRun } = await pool.query(
        "SELECT * FROM scrape_runs WHERE fonte = $1 ORDER BY finalizado_em DESC LIMIT 1",
        [source.fonte],
      );
      source.ultima_execucao = lastRun[0] ?? null;
    }
    reply.send(sources);
  });

  app.get("/api/sources/:source/runs", async (req, reply) => {
    const source = (req.params as { source: string }).source;
    const q = runsQuery.parse(req.query);
    const limit = parseLimit(q.limit);
    const cursorParts = decodeCursor(q.cursor);
    const values: unknown[] = [source];
    let cursorClause = "";
    if (cursorParts) {
      values.push((cursorParts as [number])[0]);
      cursorClause = `AND id < $${values.length}`;
    }
    values.push(limit);

    const { rows } = await pool.query(
      `SELECT * FROM scrape_runs WHERE fonte = $1 ${cursorClause}
        ORDER BY id DESC LIMIT $${values.length}`,
      values,
    );
    const last = rows[rows.length - 1];
    reply.send({ items: rows, nextCursor: rows.length === limit && last ? encodeCursor([last.id]) : null });
  });

  app.patch("/api/sources/:source", async (req, reply) => {
    const source = (req.params as { source: string }).source;
    const body = patchBody.parse(req.body);
    if (!SELF_SERVICE_SOURCES.has(source)) {
      throw new ForbiddenError(
        `"${source}" não pode ser ligada/desligada pela API — segue a escada de escalonamento da seção 4.5 do SPEC.`,
      );
    }
    const { rows } = await pool.query("UPDATE fontes SET ativa = $2 WHERE fonte = $1 RETURNING *", [source, body.active]);
    if (!rows[0]) throw new NotFoundError("Fonte não encontrada.");
    reply.send(rows[0]);
  });
}

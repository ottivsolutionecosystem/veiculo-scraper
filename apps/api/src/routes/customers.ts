import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { decodeCursor, encodeCursor, parseLimit } from "../lib/pagination.js";
import { NotFoundError } from "../lib/http-errors.js";

const listQuery = z.object({ cursor: z.string().optional(), limit: z.string().optional() });
const createCustomer = z.object({
  name: z.string(),
  contact: z.string(),
  source: z.string(),
  owner: z.string(),
  notes: z.string().optional(),
});
const createInterest = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  yearMin: z.number().optional(),
  yearMax: z.number().optional(),
  maxKm: z.number().optional(),
  priceMinCents: z.number().optional(),
  priceMaxCents: z.number().optional(),
  transmission: z.string().optional(),
  city: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]),
});

/** GET/POST /api/customers* — Clientes e interesses (docs/API.md seção 5). */
export async function customerRoutes(app: FastifyInstance) {
  app.get("/api/customers", async (req, reply) => {
    const q = listQuery.parse(req.query);
    const limit = parseLimit(q.limit);
    const cursorParts = decodeCursor(q.cursor);
    const values: unknown[] = [];
    let cursorClause = "";
    if (cursorParts) {
      values.push((cursorParts as [number])[0]);
      cursorClause = `WHERE c.id > $${values.length}`;
    }
    values.push(limit);

    const { rows } = await pool.query(
      `SELECT c.*,
              (SELECT count(*) FROM interesses i WHERE i.cliente_id = c.id) AS total_interesses,
              (SELECT count(*) FROM matches_interesse mi
                 JOIN interesses i ON i.id = mi.interesse_id
                WHERE i.cliente_id = c.id AND mi.estado != 'discarded') AS total_matches
         FROM clientes c
         ${cursorClause}
        ORDER BY c.id ASC
        LIMIT $${values.length}`,
      values,
    );
    const last = rows[rows.length - 1];
    reply.send({ items: rows, nextCursor: rows.length === limit && last ? encodeCursor([last.id]) : null });
  });

  app.get("/api/customers/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const { rows: customerRows } = await pool.query("SELECT * FROM clientes WHERE id = $1", [id]);
    if (!customerRows[0]) throw new NotFoundError("Cliente não encontrado.");

    const { rows: interests } = await pool.query("SELECT * FROM interesses WHERE cliente_id = $1", [id]);
    for (const interest of interests) {
      const { rows: matches } = await pool.query(
        `SELECT mi.*, a.marca, a.modelo, a.ano_modelo, a.preco FROM matches_interesse mi
           JOIN veiculos v ON v.id = mi.veiculo_id
           JOIN anuncios a ON a.id = v.anuncio_principal_id
          WHERE mi.interesse_id = $1 AND mi.estado != 'discarded'
          ORDER BY mi.score_aderencia DESC`,
        [interest.id],
      );
      interest.matches = matches;
    }

    reply.send({ customer: customerRows[0], interests });
  });

  app.post("/api/customers", async (req, reply) => {
    const body = createCustomer.parse(req.body);
    const { rows } = await pool.query(
      "INSERT INTO clientes (nome, contato, origem, responsavel, observacoes) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [body.name, body.contact, body.source, body.owner, body.notes ?? null],
    );
    reply.status(201).send(rows[0]);
  });

  app.patch("/api/customers/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = createCustomer.partial().parse(req.body);
    const { rows } = await pool.query(
      `UPDATE clientes SET
         nome = COALESCE($2, nome), contato = COALESCE($3, contato),
         origem = COALESCE($4, origem), responsavel = COALESCE($5, responsavel),
         observacoes = COALESCE($6, observacoes)
       WHERE id = $1 RETURNING *`,
      [id, body.name, body.contact, body.source, body.owner, body.notes],
    );
    if (!rows[0]) throw new NotFoundError("Cliente não encontrado.");
    reply.send(rows[0]);
  });

  app.post("/api/customers/:id/interests", async (req, reply) => {
    const clienteId = Number((req.params as { id: string }).id);
    const body = createInterest.parse(req.body);
    const { rows } = await pool.query(
      `INSERT INTO interesses (
         cliente_id, marca, modelo, ano_min, ano_max, km_maximo, preco_min, preco_max,
         cambio, cidade, prioridade
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        clienteId, body.brand ?? null, body.model ?? null, body.yearMin ?? null, body.yearMax ?? null,
        body.maxKm ?? null, body.priceMinCents ?? null, body.priceMaxCents ?? null,
        body.transmission ?? null, body.city ?? null, body.priority,
      ],
    );
    reply.status(201).send(rows[0]);
  });
}

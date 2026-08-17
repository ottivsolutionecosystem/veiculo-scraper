import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool, withTransaction } from "../db.js";
import { NotFoundError, ValidationError } from "../lib/http-errors.js";
import { assertHasDiscardReason } from "../lib/regras-descarte.js";

const discardBody = z.object({ reason: z.string(), notes: z.string().optional() });
const interactionBody = z.object({
  channel: z.enum(["phone", "whatsapp"]),
  outcome: z
    .enum(["no_answer", "not_interested", "thinking", "negotiating", "agreed_to_bring", "wrong_number"])
    .optional(),
  durationSeconds: z.number().optional(),
});
const fipeConfirmBody = z.object({ fipeCode: z.string() });

/** GET/POST /api/vehicles/:id/* — Ficha do veículo (docs/API.md seção 3)
 * e Revisão de match FIPE (seção 8), que reusa o mesmo confirm. */
export async function vehicleRoutes(app: FastifyInstance) {
  app.get("/api/vehicles/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);

    const { rows: veiculoRows } = await pool.query(
      `SELECT v.*, s.total AS score_total, s.faixa AS score_faixa, s.componentes AS score_componentes,
              s.calculado_em AS score_calculado_em
         FROM veiculos v
         LEFT JOIN scores s ON s.veiculo_id = v.id
        WHERE v.id = $1`,
      [id],
    );
    const vehicle = veiculoRows[0];
    if (!vehicle) throw new NotFoundError("Veículo não encontrado.");

    const { rows: listings } = await pool.query(
      `SELECT a.* FROM anuncios a
         JOIN anuncio_veiculo av ON av.anuncio_id = a.id
        WHERE av.veiculo_id = $1
        ORDER BY a.id`,
      [id],
    );

    const { rows: priceHistory } = await pool.query(
      `SELECT ph.* FROM preco_historico ph
         JOIN anuncio_veiculo av ON av.anuncio_id = ph.anuncio_id
        WHERE av.veiculo_id = $1
        ORDER BY ph.observado_em DESC`,
      [id],
    );

    const seller = vehicle.vendedor_id
      ? (await pool.query("SELECT * FROM vendedores WHERE id = $1", [vehicle.vendedor_id])).rows[0]
      : null;
    const otherVehicles = vehicle.vendedor_id
      ? (
          await pool.query(
            `SELECT v.id, a.marca, a.modelo, a.ano_modelo FROM veiculos v
               JOIN anuncios a ON a.id = v.anuncio_principal_id
              WHERE v.vendedor_id = $1 AND v.id != $2`,
            [vehicle.vendedor_id, id],
          )
        ).rows
      : [];

    const { rows: matches } = await pool.query(
      `SELECT mi.*, c.nome AS cliente_nome, c.id AS cliente_id
         FROM matches_interesse mi
         JOIN interesses i ON i.id = mi.interesse_id
         JOIN clientes c ON c.id = i.cliente_id
        WHERE mi.veiculo_id = $1 AND mi.estado != 'discarded'`,
      [id],
    );

    reply.send({ vehicle, listings, priceHistory, seller, otherVehicles, matches });
  });

  app.post("/api/vehicles/:id/discard", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = discardBody.parse(req.body);
    try {
      assertHasDiscardReason(body.reason);
    } catch (err) {
      throw new ValidationError((err as Error).message);
    }

    await withTransaction(async (client) => {
      const { rowCount } = await client.query(
        "UPDATE veiculos SET estado = 'discarded', motivo_descarte = $2, atualizado_em = now() WHERE id = $1",
        [id, body.reason],
      );
      if (rowCount === 0) throw new NotFoundError("Veículo não encontrado.");
      await client.query(
        "INSERT INTO estados_veiculo (veiculo_id, estado, motivo, autor) VALUES ($1, 'discarded', $2, 'api')",
        [id, body.reason],
      );
      await client.query("INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe) VALUES ('discard', 'api', 'vehicle', $1, $2)", [
        String(id),
        body.reason,
      ]);
    });

    reply.status(204).send();
  });

  app.post("/api/vehicles/:id/interactions", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = interactionBody.parse(req.body);

    const { rows } = await pool.query("SELECT vendedor_id FROM veiculos WHERE id = $1", [id]);
    if (!rows[0]) throw new NotFoundError("Veículo não encontrado.");

    await pool.query(
      `INSERT INTO interacoes (veiculo_id, vendedor_id, canal, resultado, duracao_segundos, autor)
       VALUES ($1, $2, $3, $4, $5, 'api')`,
      [id, rows[0].vendedor_id, body.channel, body.outcome ?? null, body.durationSeconds ?? null],
    );
    reply.status(201).send();
  });

  app.post("/api/vehicles/:id/fipe-match/confirm", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const body = fipeConfirmBody.parse(req.body);

    const { rows: fipeRows } = await pool.query(
      `SELECT fa.codigo, fp.valor FROM fipe_anos fa
         JOIN fipe_precos fp ON fp.fipe_ano_codigo = fa.codigo
        WHERE fa.codigo = $1
        ORDER BY fp.mes_referencia DESC LIMIT 1`,
      [body.fipeCode],
    );
    if (!fipeRows[0]) throw new NotFoundError("Código FIPE não encontrado.");

    await withTransaction(async (client) => {
      const { rows: vRows } = await client.query(
        `SELECT a.preco FROM veiculos v JOIN anuncios a ON a.id = v.anuncio_principal_id WHERE v.id = $1`,
        [id],
      );
      if (!vRows[0]) throw new NotFoundError("Veículo não encontrado.");
      const preco = vRows[0].preco as number | null;
      const valorFipe = fipeRows[0].valor as number;
      const descontoReais = preco === null ? null : valorFipe - preco;
      const descontoPct = preco === null ? null : Number((((valorFipe - preco) / valorFipe) * 100).toFixed(1));

      await client.query(
        `UPDATE veiculos SET fipe_ano_codigo = $2, fipe_confianca = 1.0, fipe_candidatos = NULL,
                              desconto_fipe_pct = $3, desconto_fipe_reais = $4, atualizado_em = now()
          WHERE id = $1`,
        [id, body.fipeCode, descontoPct, descontoReais],
      );

      const { rows: tituloRows } = await client.query(
        `SELECT a.titulo_normalizado FROM veiculos v JOIN anuncios a ON a.id = v.anuncio_principal_id WHERE v.id = $1`,
        [id],
      );
      await client.query(
        `INSERT INTO fipe_aliases (padrao_texto, fipe_ano_codigo, confirmado_por)
         VALUES ($1, $2, 'api') ON CONFLICT (padrao_texto) DO UPDATE SET fipe_ano_codigo = EXCLUDED.fipe_ano_codigo`,
        [tituloRows[0]?.titulo_normalizado ?? "", body.fipeCode],
      );
    });

    reply.status(204).send();
  });
}

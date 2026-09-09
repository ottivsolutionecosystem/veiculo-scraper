import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool, withTransaction, refreshFilaDoDia, refreshFilaDoDiaAsync } from "../db.js";
import { mapVehicleDetail, mapSeller, mapListing, maskPhone, mapInterestMatch, mapInteraction } from "../lib/serialize.js";
import { NotFoundError, ValidationError, ConflictError } from "../lib/http-errors.js";
import { assertHasDiscardReason } from "../lib/regras-descarte.js";
import { canClaim, canTransfer, followUpAt, lockUntil } from "../lib/consignacao.js";
import { lockFromRow, VEHICLE_LOCK_SQL } from "../lib/vehicle-lock.js";
import { requireOperator } from "../lib/current-operator.js";
import { isMaster } from "../lib/roles.js";
import { manualContactExpiry, normalizePhoneBR, phoneHash } from "../lib/telefone.js";
import { recordCall } from "../jobs/record-call.js";

const discardBody = z.object({ reason: z.string(), notes: z.string().optional() });
const callOutcome = z.enum([
  "no_answer",
  "not_interested",
  "thinking",
  "negotiating",
  "agreed_to_bring",
  "accepted_consign",
  "wants_cash",
  "unrealistic_price",
  "wrong_number",
]);
const interactionBody = z.object({
  channel: z.enum(["phone", "whatsapp"]),
  outcome: callOutcome.optional(),
  durationSeconds: z.number().optional(),
  operator: z.string().optional(),
});
const transferBody = z.object({ toOperatorId: z.number().int().positive() });
const sellerContactBody = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
});
const fipeConfirmBody = z.object({ fipeCode: z.string() });

/** GET/POST /api/vehicles/:id/* — Ficha do veículo (docs/API.md seção 3)
 * e Revisão de match FIPE (seção 8), que reusa o mesmo confirm. */
export async function vehicleRoutes(app: FastifyInstance) {
  app.get("/api/vehicles/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);

    const { rows: veiculoRows } = await pool.query(
      `SELECT v.*, s.total AS score_total, s.faixa AS score_faixa, s.componentes AS score_componentes,
              s.calculado_em AS score_calculado_em,
              EXTRACT(DAY FROM now() - pa.primeira_vista_em)::int AS dias_no_ar
         FROM veiculos v
         LEFT JOIN scores s ON s.veiculo_id = v.id
         JOIN anuncios pa ON pa.id = v.anuncio_principal_id
        WHERE v.id = $1`,
      [id],
    );
    const vehicle = veiculoRows[0];
    if (!vehicle) throw new NotFoundError("Veículo não encontrado.");

    const { rows: listingRows } = await pool.query(
      `SELECT a.* FROM anuncios a
         JOIN anuncio_veiculo av ON av.anuncio_id = a.id
        WHERE av.veiculo_id = $1
        ORDER BY a.id`,
      [id],
    );

    const { rows: priceHistoryRows } = await pool.query(
      `SELECT ph.* FROM preco_historico ph
         JOIN anuncio_veiculo av ON av.anuncio_id = ph.anuncio_id
        WHERE av.veiculo_id = $1
        ORDER BY ph.observado_em DESC`,
      [id],
    );

    const { rows: matchRows } = await pool.query(
      `SELECT mi.*, c.id AS cliente_id, c.nome AS cliente_nome
         FROM matches_interesse mi
         JOIN interesses i ON i.id = mi.interesse_id
         JOIN clientes c ON c.id = i.cliente_id
        WHERE mi.veiculo_id = $1 AND mi.estado != 'discarded'`,
      [id],
    );

    const vehicleDetail = mapVehicleDetail(vehicle, listingRows, priceHistoryRows, {
      daysListed: Number(vehicle.dias_no_ar ?? 0),
      compatibleCustomersCount: matchRows.length,
    });

    let seller = null;
    let otherVehicles: unknown[] = [];
    if (vehicle.vendedor_id) {
      const { rows: sellerRows } = await pool.query(
        `SELECT vd.*, cv.telefone_e164 FROM vendedores vd
           LEFT JOIN contatos_vendedor cv ON cv.vendedor_id = vd.id
          WHERE vd.id = $1`,
        [vehicle.vendedor_id],
      );
      if (sellerRows[0]) {
        seller = mapSeller(sellerRows[0]);
        seller.maskedPhone = maskPhone(sellerRows[0].telefone_e164);
      }
      const { rows: otherRows } = await pool.query(
        `SELECT v.id AS veiculo_id, a.* FROM veiculos v
           JOIN anuncios a ON a.id = v.anuncio_principal_id
          WHERE v.vendedor_id = $1 AND v.id != $2`,
        [vehicle.vendedor_id, id],
      );
      otherVehicles = otherRows.map((r) => ({ vehicleId: Number(r.veiculo_id), listing: mapListing(r) }));
    }

    const matches = matchRows.map((m) => ({
      ...mapInterestMatch(m),
      customer: { id: Number(m.cliente_id), name: m.cliente_nome },
    }));

    const { rows: interactionRows } = await pool.query(
      `SELECT id, veiculo_id, vendedor_id, canal, resultado, duracao_segundos, autor,
              criado_em, iniciada_em, encerrada_em, gravacao_id, gravacao_url
         FROM interacoes
        WHERE veiculo_id = $1
        ORDER BY criado_em DESC, id DESC
        LIMIT 20`,
      [id],
    );

    reply.send({
      vehicle: vehicleDetail,
      seller,
      otherVehicles,
      matches,
      interactions: interactionRows.map(mapInteraction),
    });
  });

  app.post("/api/vehicles/:id/discard", async (req, reply) => {
    const actor = await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    const body = discardBody.parse(req.body);
    try {
      assertHasDiscardReason(body.reason);
    } catch (err) {
      throw new ValidationError((err as Error).message);
    }

    const { rows } = await pool.query(VEHICLE_LOCK_SQL, [id]);
    if (!rows[0]) throw new NotFoundError("Veículo não encontrado.");
    const agora = new Date();
    if (!canClaim(agora, lockFromRow(rows[0]), actor.id) && !isMaster(actor)) {
      throw new ConflictError(
        `Em contato com ${rows[0].consignador ?? "outro consignador"}. Só quem está com o carro descarta.`,
      );
    }

    await withTransaction(async (client) => {
      const { rowCount } = await client.query(
        "UPDATE veiculos SET estado = 'discarded', motivo_descarte = $2, consignador = NULL, consignador_id = NULL, travado_ate = NULL, follow_up_em = NULL, atualizado_em = now() WHERE id = $1",
        [id, body.reason],
      );
      if (rowCount === 0) throw new NotFoundError("Veículo não encontrado.");
      await client.query(
        `UPDATE solicitacoes_captacao
            SET estado = 'declined', motivo_perda = $2, atualizado_em = now()
          WHERE veiculo_id = $1 AND estado NOT IN ('closed', 'declined', 'no_show')`,
        [id, body.reason],
      );
      await client.query(
        "INSERT INTO estados_veiculo (veiculo_id, estado, motivo, autor) VALUES ($1, 'discarded', $2, $3)",
        [id, body.reason, actor.login],
      );
      await client.query("INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe) VALUES ('discard', $1, 'vehicle', $2, $3)", [
        actor.login,
        String(id),
        body.reason,
      ]);
    });

    refreshFilaDoDia();
    reply.status(204).send();
  });

  app.post("/api/vehicles/:id/claim", async (req, reply) => {
    const actor = await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    let requestId = 0;

    await withTransaction(async (client) => {
      const { rows } = await client.query(`${VEHICLE_LOCK_SQL} FOR UPDATE`, [id]);
      if (!rows[0]) throw new NotFoundError("Veículo não encontrado.");
      if (rows[0].estado === "acquired") {
        throw new ConflictError("Este carro já está no estoque consignado.");
      }
      const agora = new Date();
      if (!canClaim(agora, lockFromRow(rows[0]), actor.id)) {
        throw new ConflictError(
          `Em contato com ${rows[0].consignador ?? "outro consignador"}. Peça a transferência se não for seguir.`,
        );
      }

      const { rows: openRows } = await client.query(
        `SELECT id FROM solicitacoes_captacao
          WHERE veiculo_id = $1 AND estado NOT IN ('closed', 'declined', 'no_show')
          LIMIT 1`,
        [id],
      );
      if (openRows[0]) {
        requestId = Number(openRows[0].id);
        if (Number(rows[0].consignador_id) === actor.id) return;
        throw new ConflictError("Já existe uma tratativa em aberto para este veículo.");
      }

      const { rows: unitRows } = await client.query("SELECT id FROM unidades ORDER BY id ASC LIMIT 1");
      if (!unitRows[0]) throw new ValidationError("Cadastre uma unidade antes de consignar.");

      await client.query(
        `UPDATE veiculos
            SET consignador = $2, consignador_id = $3, travado_ate = $4, estado = 'requested', atualizado_em = now()
          WHERE id = $1`,
        [id, actor.name, actor.id, lockUntil(agora)],
      );

      const { rows: inserted } = await client.query(
        `INSERT INTO solicitacoes_captacao (veiculo_id, vendedor_id, unidade_id, responsavel, data_hora_proposta, estado)
         VALUES ($1,$2,$3,$4,NULL,'requested') RETURNING id`,
        [id, rows[0].vendedor_id ?? null, unitRows[0].id, actor.login],
      );
      requestId = Number(inserted[0]!.id);

      await client.query(
        `INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe)
         VALUES ('claim', $1, 'vehicle', $2, $3)`,
        [actor.login, String(id), actor.name],
      );
    });

    await refreshFilaDoDiaAsync();
    reply.send({ vehicleId: id, requestId });
  });

  app.post("/api/vehicles/:id/transfer", async (req, reply) => {
    const actor = await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    const body = transferBody.parse(req.body);
    const { rows } = await pool.query(
      "SELECT consignador, consignador_id FROM veiculos WHERE id = $1",
      [id],
    );
    if (!rows[0]) throw new NotFoundError("Veículo não encontrado.");
    const ownerId = rows[0].consignador_id === null ? null : Number(rows[0].consignador_id);
    if (!canTransfer(ownerId, actor.id, body.toOperatorId, isMaster(actor))) {
      throw new ConflictError("Só quem está com o carro pode transferir para outra pessoa.");
    }
    const { rows: dest } = await pool.query(
      "SELECT id, nome, login FROM operadores WHERE id = $1 AND ativo = true",
      [body.toOperatorId],
    );
    if (!dest[0]) throw new NotFoundError("Consignador de destino não encontrado.");
    const agora = new Date();
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE veiculos
            SET consignador = $2,
                consignador_id = $3,
                travado_ate = $4,
                follow_up_em = $5,
                atualizado_em = now()
          WHERE id = $1`,
        [id, dest[0].nome, Number(dest[0].id), lockUntil(agora), followUpAt(agora, 0)],
      );
      await client.query(
        `UPDATE solicitacoes_captacao
            SET responsavel = $2, atualizado_em = now()
          WHERE veiculo_id = $1 AND estado NOT IN ('closed', 'declined', 'no_show')`,
        [id, dest[0].login ?? dest[0].nome],
      );
      await client.query(
        `INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe)
         VALUES ('transfer', $1, 'vehicle', $2, $3)`,
        [actor.login, String(id), `${actor.name} → ${dest[0].nome}`],
      );
    });
    refreshFilaDoDia();
    reply.status(204).send();
  });

  /**
   * Nome e telefone que o consignador descobriu falando com o vendedor. O que
   * vem do anúncio erra muito (número de intermediário, nome do anunciante e
   * não do dono), e sem isso o carro fica sem canal de saída.
   */
  app.put("/api/vehicles/:id/seller", async (req, reply) => {
    const actor = await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    const body = sellerContactBody.parse(req.body);

    let sellerId = 0;
    await withTransaction(async (client) => {
      const { rows } = await client.query(
        "SELECT id, vendedor_id, consignador_id, consignador FROM veiculos WHERE id = $1 FOR UPDATE",
        [id],
      );
      const vehicle = rows[0];
      if (!vehicle) throw new NotFoundError("Veículo não encontrado.");
      if (vehicle.consignador_id != null && !isMaster(actor) && Number(vehicle.consignador_id) !== actor.id) {
        throw new ConflictError(
          `Em contato com ${vehicle.consignador ?? "outro consignador"}. Peça a transferência para editar o contato.`,
        );
      }

      const currentSellerId = vehicle.vendedor_id == null ? null : Number(vehicle.vendedor_id);
      const phone = body.phone ? normalizePhoneBR(body.phone) : null;
      if (body.phone && !phone) {
        throw new ValidationError("Telefone inválido. Use DDD e número, como (11) 99999-8888.");
      }

      if (!phone) {
        if (currentSellerId === null) {
          throw new ValidationError("Informe o telefone para cadastrar o vendedor.");
        }
        sellerId = currentSellerId;
        await client.query("UPDATE vendedores SET nome = $2, atualizado_em = now() WHERE id = $1", [
          sellerId,
          body.name,
        ]);
      } else {
        const hash = phoneHash(phone);

        const { rows: blocked } = await client.query(
          "SELECT 1 FROM bloqueio_contato WHERE telefone_hash = $1",
          [hash],
        );
        if (blocked[0]) {
          throw new ConflictError("Este telefone pediu para não ser contatado. Não dá para cadastrar.");
        }

        const { rows: byHash } = await client.query(
          "SELECT id FROM vendedores WHERE telefone_hash = $1 FOR UPDATE",
          [hash],
        );
        const { rows: outros } = currentSellerId === null
          ? { rows: [{ total: 0 }] }
          : await client.query(
              "SELECT count(*)::int AS total FROM veiculos WHERE vendedor_id = $1 AND id <> $2",
              [currentSellerId, id],
            );

        if (byHash[0]) {
          // Mesmo telefone é o mesmo vendedor — é essa a chave de dedupe.
          sellerId = Number(byHash[0].id);
          await client.query("UPDATE vendedores SET nome = $2, atualizado_em = now() WHERE id = $1", [
            sellerId,
            body.name,
          ]);
        } else if (currentSellerId !== null && Number(outros[0]!.total) === 0) {
          sellerId = currentSellerId;
          await client.query(
            "UPDATE vendedores SET nome = $2, telefone_hash = $3, atualizado_em = now() WHERE id = $1",
            [sellerId, body.name, hash],
          );
        } else {
          // O vendedor de hoje responde por outros carros. Trocar o telefone
          // dele mudaria anúncio que não é este, então cadastra separado.
          const { rows: criado } = await client.query(
            "INSERT INTO vendedores (nome, telefone_hash) VALUES ($1, $2) RETURNING id",
            [body.name, hash],
          );
          sellerId = Number(criado[0]!.id);
        }

        await client.query(
          `INSERT INTO contatos_vendedor (vendedor_id, telefone_e164, fonte_primeira_coleta, ttl_expira_em)
           VALUES ($1, $2, NULL, $3)
           ON CONFLICT (vendedor_id) DO UPDATE
              SET telefone_e164 = EXCLUDED.telefone_e164,
                  ttl_expira_em = EXCLUDED.ttl_expira_em`,
          [sellerId, phone, manualContactExpiry()],
        );
      }

      if (currentSellerId !== sellerId) {
        await client.query("UPDATE veiculos SET vendedor_id = $2, atualizado_em = now() WHERE id = $1", [
          id,
          sellerId,
        ]);
        await client.query(
          `UPDATE solicitacoes_captacao SET vendedor_id = $2, atualizado_em = now()
            WHERE veiculo_id = $1 AND estado NOT IN ('closed', 'declined', 'no_show')`,
          [id, sellerId],
        );
      }

      // Sem telefone no detalhe: auditoria não é lugar de dado pessoal.
      await client.query(
        `INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe)
         VALUES ('edit_seller_contact', $1, 'seller', $2, $3)`,
        [
          actor.login,
          String(sellerId),
          phone ? `Contato do veículo #${id} anotado à mão` : `Nome do vendedor do veículo #${id} corrigido`,
        ],
      );
    });

    await refreshFilaDoDiaAsync();

    const { rows: sellerRows } = await pool.query(
      `SELECT vd.*, cv.telefone_e164
         FROM vendedores vd
         LEFT JOIN contatos_vendedor cv ON cv.vendedor_id = vd.id
        WHERE vd.id = $1`,
      [sellerId],
    );
    const seller = mapSeller(sellerRows[0]!);
    seller.maskedPhone = maskPhone(sellerRows[0]!.telefone_e164 as string | null);
    reply.send(seller);
  });

  app.post("/api/vehicles/:id/interactions", async (req, reply) => {
    const actor = await requireOperator(req);
    const id = Number((req.params as { id: string }).id);
    const body = interactionBody.parse(req.body);

    const { rows } = await pool.query(VEHICLE_LOCK_SQL, [id]);
    if (!rows[0]) throw new NotFoundError("Veículo não encontrado.");
    const agora = new Date();
    if (!canClaim(agora, lockFromRow(rows[0]), actor.id) && !isMaster(actor)) {
      throw new ConflictError(
        `Em contato com ${rows[0].consignador ?? "outro consignador"}. Peça a transferência se não for seguir.`,
      );
    }

    if (body.outcome) {
      await withTransaction(async (client) => {
        await recordCall(client, {
          vehicleId: id,
          sellerId: rows[0].vendedor_id === null ? null : Number(rows[0].vendedor_id),
          outcome: body.outcome!,
          operator: actor.name,
          operatorId: actor.id,
          channel: body.channel,
          durationSeconds: body.durationSeconds,
        });
      });
      refreshFilaDoDia();
    } else {
      await pool.query(
        `INSERT INTO interacoes (veiculo_id, vendedor_id, canal, resultado, duracao_segundos, autor)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, rows[0].vendedor_id, body.channel, null, body.durationSeconds ?? null, actor.name],
      );
    }
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

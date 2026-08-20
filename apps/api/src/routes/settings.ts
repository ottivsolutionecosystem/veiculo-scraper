import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { requireMaster } from "../lib/current-operator.js";
import { mapSettings } from "../lib/serialize.js";

const weightSchema = z.object({ key: z.string(), label: z.string(), weight: z.number() });
const settingsBody = z.object({
  weights: z.array(weightSchema),
  bandThresholds: z.object({ hot: z.number(), good: z.number(), warm: z.number() }),
  discardReasons: z.array(z.string()),
  returnTriggerPricePct: z.number(),
  returnTriggerDays: z.number(),
  sellerCooldownHours: z.number(),
  followUpDays: z.array(z.number()),
  kmCurve: z.array(z.object({ modelYear: z.number(), averageKm: z.number() })),
  whatsappTemplate: z.string(),
  allowedHoursStart: z.string(),
  allowedHoursEnd: z.string(),
  author: z.string(),
});

/** GET/PUT /api/settings — Ajustes (docs/API.md seção 10). Sempre insere
 * versão nova (nunca UPDATE) — "editável sem deploy" sem perder histórico. */
export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async (_req, reply) => {
    const { rows } = await pool.query("SELECT * FROM configuracoes ORDER BY versao DESC LIMIT 1");
    reply.send(rows[0] ? mapSettings(rows[0]) : null);
  });

  app.put("/api/settings", async (req, reply) => {
    await requireMaster(req);
    const body = settingsBody.parse(req.body);
    const { rows: currentRows } = await pool.query("SELECT versao, pesos FROM configuracoes ORDER BY versao DESC LIMIT 1");
    const nextVersion = (currentRows[0]?.versao ?? 0) + 1;

    const { rows } = await pool.query(
      `INSERT INTO configuracoes (
         versao, pesos, faixas, motivos_descarte, gatilho_retorno_pct, gatilho_retorno_dias,
         cooldown_vendedor_horas, follow_up_dias, curva_km, template_whatsapp,
         horario_permitido_inicio, horario_permitido_fim, autor
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        nextVersion, JSON.stringify(body.weights), JSON.stringify(body.bandThresholds),
        JSON.stringify(body.discardReasons), body.returnTriggerPricePct, body.returnTriggerDays,
        body.sellerCooldownHours, JSON.stringify(body.followUpDays), JSON.stringify(body.kmCurve),
        body.whatsappTemplate, body.allowedHoursStart, body.allowedHoursEnd, body.author,
      ],
    );

    // Seção 15.11: só mudança de peso é auditada — demais campos já têm
    // histórico via versao.
    const pesosAntigos = JSON.stringify(currentRows[0]?.pesos ?? null);
    const pesosNovos = JSON.stringify(body.weights);
    if (pesosAntigos !== pesosNovos) {
      await pool.query(
        "INSERT INTO auditoria (acao, autor, alvo_tipo, alvo_id, detalhe) VALUES ('change_weight', $1, 'settings', 'pesos', $2)",
        [body.author, `versão ${nextVersion}`],
      );
    }

    reply.status(201).send(mapSettings(rows[0]!));
  });
}

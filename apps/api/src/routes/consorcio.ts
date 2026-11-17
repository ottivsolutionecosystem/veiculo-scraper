import { randomBytes } from "node:crypto";

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { pool } from "../db.js";
import { requireOperator } from "../lib/current-operator.js";
import { NotFoundError, ValidationError } from "../lib/http-errors.js";
import { EMPTY_TIRES, mapConsorcioRow } from "../lib/consorcio-map.js";
import { canListOffer, deriveStatus } from "../lib/consorcio-rules.js";

const tireCondition = z.enum(["good", "fair", "poor", "unknown"]);

const tiresSchema = z.object({
  frontLeft: tireCondition,
  frontRight: tireCondition,
  rearLeft: tireCondition,
  rearRight: tireCondition,
  notes: z.string().max(2000).nullable(),
});

const photoSchema = z.object({
  id: z.string().min(1).max(64),
  slot: z.enum([
    "front",
    "rear",
    "side_right",
    "side_left",
    "dashboard",
    "odometer",
    "damage",
  ]),
  url: z.string().min(20).max(2_500_000),
  caption: z.string().max(500).nullable(),
  createdAt: z.string(),
});

const fipeSchema = z
  .object({
    code: z.string(),
    brand: z.string(),
    model: z.string(),
    modelYear: z.number(),
    fuel: z.string(),
    priceCents: z.number(),
    referenceMonth: z.string(),
    vehicleType: z.enum(["carros", "motos", "caminhoes"]),
  })
  .nullable();

const patchSchema = z.object({
  plate: z.string().max(12).optional(),
  brand: z.string().max(80).nullable().optional(),
  model: z.string().max(120).nullable().optional(),
  modelYear: z.number().int().nullable().optional(),
  color: z.string().max(40).nullable().optional(),
  km: z.number().int().nullable().optional(),
  fipe: fipeSchema.optional(),
  bidCents: z.number().int().nullable().optional(),
  financed: z.boolean().nullable().optional(),
  payoffCents: z.number().int().nonnegative().nullable().optional(),
  hasDamage: z.boolean().nullable().optional(),
  tires: tiresSchema.optional(),
  photos: z.array(photoSchema).max(30).optional(),
  ownerName: z.string().max(120).nullable().optional(),
  ownerPhone: z.string().max(40).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  /** true = grava aceite dos termos de veracidade (só avança, não desfaz). */
  acceptTerms: z.boolean().optional(),
  termsVersion: z.string().max(32).optional(),
});

const proposalSchema = z.object({
  dealerName: z.string().min(1).max(120),
  amountCents: z.number().int().positive(),
  notes: z.string().max(2000).nullable().optional(),
});

function uid(): string {
  return randomBytes(8).toString("hex");
}

async function loadById(id: string) {
  const { rows } = await pool.query(`SELECT * FROM consorcio_oferecimentos WHERE id = $1`, [id]);
  return rows[0] ? mapConsorcioRow(rows[0] as Record<string, unknown>) : null;
}

async function loadByToken(token: string) {
  const { rows } = await pool.query(`SELECT * FROM consorcio_oferecimentos WHERE public_token = $1`, [
    token,
  ]);
  return rows[0] ? mapConsorcioRow(rows[0] as Record<string, unknown>) : null;
}

async function persist(offer: ReturnType<typeof mapConsorcioRow>) {
  const status = deriveStatus(offer);
  await pool.query(
    `UPDATE consorcio_oferecimentos SET
      status = $2, plate = $3, brand = $4, model = $5, model_year = $6, color = $7, km = $8,
      fipe = $9::jsonb, bid_cents = $10, financed = $11, payoff_cents = $12,
      has_damage = $13, tires = $14::jsonb, photos = $15::jsonb,
      owner_name = $16, owner_phone = $17, notes = $18, updated_at = now(),
      listed_at = $19, proposals = $20::jsonb,
      terms_accepted_at = $21, terms_version = $22
     WHERE id = $1`,
    [
      offer.id,
      status,
      offer.plate,
      offer.brand,
      offer.model,
      offer.modelYear,
      offer.color,
      offer.km,
      JSON.stringify(offer.fipe),
      offer.bidCents,
      offer.financed,
      offer.payoffCents,
      offer.hasDamage,
      JSON.stringify(offer.tires),
      JSON.stringify(offer.photos),
      offer.ownerName,
      offer.ownerPhone,
      offer.notes,
      offer.listedAt,
      JSON.stringify(offer.proposals),
      offer.termsAcceptedAt,
      offer.termsVersion,
    ],
  );
  return loadById(offer.id);
}

function applyPatch(
  offer: NonNullable<Awaited<ReturnType<typeof loadById>>>,
  body: z.infer<typeof patchSchema>,
) {
  return {
    ...offer,
    plate: body.plate !== undefined ? body.plate.toUpperCase().replace(/[^A-Z0-9]/g, "") : offer.plate,
    brand: body.brand !== undefined ? body.brand : offer.brand,
    model: body.model !== undefined ? body.model : offer.model,
    modelYear: body.modelYear !== undefined ? body.modelYear : offer.modelYear,
    color: body.color !== undefined ? body.color : offer.color,
    km: body.km !== undefined ? body.km : offer.km,
    fipe: body.fipe !== undefined ? body.fipe : offer.fipe,
    bidCents: body.bidCents !== undefined ? body.bidCents : offer.bidCents,
    financed: body.financed !== undefined ? body.financed : offer.financed,
    payoffCents:
      body.financed === false
        ? null
        : body.payoffCents !== undefined
          ? body.payoffCents
          : offer.payoffCents,
    hasDamage: body.hasDamage !== undefined ? body.hasDamage : offer.hasDamage,
    tires: body.tires !== undefined ? body.tires : offer.tires,
    photos: body.photos !== undefined ? body.photos : offer.photos,
    ownerName: body.ownerName !== undefined ? body.ownerName : offer.ownerName,
    ownerPhone: body.ownerPhone !== undefined ? body.ownerPhone : offer.ownerPhone,
    notes: body.notes !== undefined ? body.notes : offer.notes,
    termsAcceptedAt:
      body.acceptTerms === true
        ? (offer.termsAcceptedAt ?? new Date().toISOString())
        : offer.termsAcceptedAt,
    termsVersion:
      body.acceptTerms === true
        ? (body.termsVersion?.trim() || offer.termsVersion || "2026-03-17")
        : offer.termsVersion,
  };
}

export async function consorcioRoutes(app: FastifyInstance) {
  app.get("/api/consorcio/offers", async (req, reply) => {
    await requireOperator(req);
    const { rows } = await pool.query(
      `SELECT * FROM consorcio_oferecimentos ORDER BY updated_at DESC LIMIT 100`,
    );
    reply.send({ items: rows.map((r) => mapConsorcioRow(r as Record<string, unknown>)) });
  });

  app.post("/api/consorcio/offers", async (req, reply) => {
    const op = await requireOperator(req);
    const id = uid();
    const token = uid() + uid();
    await pool.query(
      `INSERT INTO consorcio_oferecimentos
        (id, public_token, status, tires, photos, proposals, created_by)
       VALUES ($1, $2, 'draft', $3::jsonb, '[]'::jsonb, '[]'::jsonb, $4)`,
      [id, token, JSON.stringify(EMPTY_TIRES), op.login],
    );
    const offer = await loadById(id);
    reply.status(201).send(offer);
  });

  app.get("/api/consorcio/offers/:id", async (req, reply) => {
    await requireOperator(req);
    const { id } = req.params as { id: string };
    const offer = await loadById(id);
    if (!offer) throw new NotFoundError("Oferecimento não encontrado.");
    reply.send(offer);
  });

  app.patch("/api/consorcio/offers/:id", async (req, reply) => {
    await requireOperator(req);
    const { id } = req.params as { id: string };
    const body = patchSchema.parse(req.body);
    const current = await loadById(id);
    if (!current) throw new NotFoundError("Oferecimento não encontrado.");
    const next = await persist(applyPatch(current, body));
    reply.send(next);
  });

  app.post("/api/consorcio/offers/:id/list", async (req, reply) => {
    await requireOperator(req);
    const { id } = req.params as { id: string };
    const current = await loadById(id);
    if (!current) throw new NotFoundError("Oferecimento não encontrado.");
    if (!canListOffer(current)) {
      throw new ValidationError(
        "Complete placa, FIPE, lance, financiamento e as 6 fotos obrigatórias.",
      );
    }
    const next = await persist({
      ...current,
      listedAt: current.listedAt ?? new Date().toISOString(),
    });
    reply.send(next);
  });

  app.post("/api/consorcio/offers/:id/proposals", async (req, reply) => {
    await requireOperator(req);
    const { id } = req.params as { id: string };
    const body = proposalSchema.parse(req.body);
    const current = await loadById(id);
    if (!current) throw new NotFoundError("Oferecimento não encontrado.");
    const proposal = {
      id: uid(),
      dealerName: body.dealerName.trim(),
      amountCents: body.amountCents,
      notes: body.notes ?? null,
      createdAt: new Date().toISOString(),
    };
    const next = await persist({
      ...current,
      proposals: [proposal, ...current.proposals],
      listedAt: current.listedAt ?? new Date().toISOString(),
    });
    reply.send(next);
  });

  /** Público — cliente completa a avaliação pelo link. */
  app.get("/api/consorcio/public/:token", async (req, reply) => {
    const { token } = req.params as { token: string };
    const offer = await loadByToken(token);
    if (!offer) throw new NotFoundError("Link inválido ou expirado.");
    reply.send(offer);
  });

  app.patch("/api/consorcio/public/:token", async (req, reply) => {
    const { token } = req.params as { token: string };
    const body = patchSchema.parse(req.body);
    const current = await loadByToken(token);
    if (!current) throw new NotFoundError("Link inválido ou expirado.");
    if (current.status === "closed") {
      throw new ValidationError("Esta avaliação já foi encerrada.");
    }
    const next = await persist(applyPatch(current, body));
    reply.send(next);
  });
}

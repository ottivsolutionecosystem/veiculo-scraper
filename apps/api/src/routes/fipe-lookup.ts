import type { FastifyInstance } from "fastify";
import { z } from "zod";

import {
  lookupBrands,
  lookupModels,
  lookupPrice,
  lookupYears,
  type FipeVehicleTypePt,
} from "../lib/parallelum-fipe-lookup.js";
import { createPlateLookupProvider } from "../providers/plate-lookup.js";
import { NotFoundError, ValidationError } from "../lib/http-errors.js";

const typeSchema = z.enum(["carros", "motos", "caminhoes"]);
const OLD_PLATE = /^[A-Z]{3}\d{4}$/;
const MERCOSUL_PLATE = /^[A-Z]{3}\d[A-Z]\d{2}$/;

function parseType(raw: unknown): FipeVehicleTypePt {
  const parsed = typeSchema.safeParse(raw ?? "carros");
  if (!parsed.success) throw new ValidationError("Tipo FIPE inválido.");
  return parsed.data;
}

function normalizePlateParam(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

/**
 * Proxy público Parallelum + FIPE por placa (APIBrasil).
 * Sem login: o cliente precisa disso no formulário `/o/:token`.
 */
export async function fipeLookupRoutes(app: FastifyInstance) {
  const plateLookup = createPlateLookupProvider();

  app.get("/api/fipe/brands", async (req, reply) => {
    const type = parseType((req.query as { type?: string }).type);
    reply.send({ items: await lookupBrands(type) });
  });

  app.get("/api/fipe/brands/:brand/models", async (req, reply) => {
    const type = parseType((req.query as { type?: string }).type);
    const { brand } = req.params as { brand: string };
    reply.send({ items: await lookupModels(type, brand) });
  });

  app.get("/api/fipe/brands/:brand/models/:model/years", async (req, reply) => {
    const type = parseType((req.query as { type?: string }).type);
    const { brand, model } = req.params as { brand: string; model: string };
    reply.send({ items: await lookupYears(type, brand, model) });
  });

  app.get("/api/fipe/brands/:brand/models/:model/years/:year", async (req, reply) => {
    const type = parseType((req.query as { type?: string }).type);
    const { brand, model, year } = req.params as {
      brand: string;
      model: string;
      year: string;
    };
    reply.send(await lookupPrice(type, brand, model, year));
  });

  /** FIPE por placa via APIBrasil — não loga placa/chassi. */
  app.get("/api/fipe/by-plate/:plate", async (req, reply) => {
    if (!plateLookup.configured()) {
      throw new ValidationError("Consulta por placa não configurada.");
    }
    const plate = normalizePlateParam((req.params as { plate: string }).plate);
    if (!OLD_PLATE.test(plate) && !MERCOSUL_PLATE.test(plate)) {
      throw new ValidationError("Placa inválida.");
    }
    try {
      reply.send(await plateLookup.lookupByPlate(plate));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Consulta de placa falhou.";
      if (/nenhuma fipe/i.test(message)) throw new NotFoundError(message);
      throw new ValidationError(message);
    }
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import {
  lookupBrands,
  lookupModels,
  lookupPrice,
  lookupYears,
  type FipeVehicleTypePt,
} from "../lib/parallelum-fipe-lookup.js";
import { ValidationError } from "../lib/http-errors.js";

const typeSchema = z.enum(["carros", "motos", "caminhoes"]);

function parseType(raw: unknown): FipeVehicleTypePt {
  const parsed = typeSchema.safeParse(raw ?? "carros");
  if (!parsed.success) throw new ValidationError("Tipo FIPE inválido.");
  return parsed.data;
}

/**
 * Proxy público Parallelum → cascade do oferecimento / link `/o/:token`.
 * Sem login: o cliente precisa consultar FIPE no formulário público.
 */
export async function fipeLookupRoutes(app: FastifyInstance) {
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
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireMaster } from "../lib/current-operator.js";
import { unmapSellerType } from "../lib/serialize.js";
import { parseLimit } from "../lib/pagination.js";
import { resolvePeriod } from "../lib/ops.js";
import { loadOpsOverview, loadOpsOverdue, loadOpsVisits } from "../lib/ops-data.js";

const rangeEnum = z.enum(["today", "7d", "30d", "month"]);

const overviewQuery = z.object({
  range: rangeEnum.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  operatorId: z.coerce.number().int().positive().optional(),
  sellerType: z.enum(["individual", "dealer"]).optional(),
});

const listQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  operatorId: z.coerce.number().int().positive().optional(),
  sellerType: z.enum(["individual", "dealer"]).optional(),
});

/** GET /api/ops/* — dashboard de operação, só master (docs/API.md seção 13). */
export async function opsRoutes(app: FastifyInstance) {
  app.get("/api/ops/overview", async (req, reply) => {
    await requireMaster(req);
    const q = overviewQuery.parse(req.query);
    const period = resolvePeriod({ range: q.range, from: q.from, to: q.to });
    const overview = await loadOpsOverview({
      range: period.range,
      from: period.from,
      to: period.to,
      prevFrom: period.prevFrom,
      prevTo: period.prevTo,
      operatorId: q.operatorId,
      sellerType: unmapSellerType(q.sellerType) ?? undefined,
    });
    reply.send(overview);
  });

  app.get("/api/ops/overdue", async (req, reply) => {
    await requireMaster(req);
    const q = listQuery.parse(req.query);
    const page = await loadOpsOverdue(
      {
        operatorId: q.operatorId,
        sellerType: unmapSellerType(q.sellerType) ?? undefined,
      },
      q.cursor,
      parseLimit(q.limit),
    );
    reply.send(page);
  });

  app.get("/api/ops/visits", async (req, reply) => {
    await requireMaster(req);
    const q = listQuery.parse(req.query);
    const page = await loadOpsVisits(
      {
        operatorId: q.operatorId,
        sellerType: unmapSellerType(q.sellerType) ?? undefined,
      },
      q.cursor,
      parseLimit(q.limit),
    );
    reply.send(page);
  });
}

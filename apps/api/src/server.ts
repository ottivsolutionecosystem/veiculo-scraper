import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";

import { env } from "./env.js";
import { isMainModule } from "./lib/is-main.js";
import { HttpError } from "./lib/http-errors.js";
import { queueRoutes } from "./routes/queue.js";
import { searchRoutes } from "./routes/search.js";
import { vehicleRoutes } from "./routes/vehicles.js";
import { dialerRoutes } from "./routes/dialer.js";
import { customerRoutes } from "./routes/customers.js";
import { requestRoutes } from "./routes/requests.js";
import { sellerRoutes } from "./routes/sellers.js";
import { fipeReviewRoutes } from "./routes/fipe-review.js";
import { sourceRoutes } from "./routes/sources.js";
import { settingsRoutes } from "./routes/settings.js";
import { auditRoutes } from "./routes/audit.js";
import { branchRoutes } from "./routes/branches.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { authRoutes } from "./routes/auth.js";
import { operatorRoutes } from "./routes/operators.js";
import { opsRoutes } from "./routes/ops.js";
import { telephonyRoutes } from "./routes/telephony.js";

export function buildServer() {
  const app = Fastify({ logger: true, trustProxy: true });

  app.register(cors, {
    origin: env.webOrigin,
    credentials: true,
  });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof HttpError) {
      reply.status(err.status).send({ error: err.message });
      return;
    }
    if (err instanceof ZodError) {
      reply.status(400).send({ error: "Payload inválido.", issues: err.issues });
      return;
    }
    if ((err as { statusCode?: number }).statusCode) {
      reply.status((err as { statusCode: number }).statusCode).send({ error: err.message });
      return;
    }
    app.log.error(err);
    reply.status(500).send({ error: "Erro interno." });
  });

  app.register(authRoutes);
  app.register(operatorRoutes);
  app.register(opsRoutes);
  app.register(queueRoutes);
  app.register(searchRoutes);
  app.register(vehicleRoutes);
  app.register(dialerRoutes);
  app.register(customerRoutes);
  app.register(requestRoutes);
  app.register(sellerRoutes);
  app.register(fipeReviewRoutes);
  app.register(sourceRoutes);
  app.register(settingsRoutes);
  app.register(auditRoutes);
  app.register(branchRoutes);
  app.register(webhookRoutes);
  app.register(telephonyRoutes);

  app.get("/health", async () => ({ ok: true }));

  return app;
}

if (isMainModule(import.meta.url)) {
  const app = buildServer();
  app.listen({ port: env.port, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}

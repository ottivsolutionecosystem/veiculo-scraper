import "dotenv/config";

const isProd = process.env.NODE_ENV === "production";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? (isProd ? undefined : fallback);
  if (!value) throw new Error(`variável de ambiente ausente: ${name}`);
  return value;
}

function sessionSecret(): string {
  const value = process.env.SESSION_SECRET ?? (isProd ? undefined : "dev-session-secret-mude-em-producao");
  if (!value) throw new Error("variável de ambiente ausente: SESSION_SECRET");
  if (isProd && (value === "dev-session-secret-mude-em-producao" || value.length < 32)) {
    throw new Error(
      "SESSION_SECRET de produção precisa ter pelo menos 32 caracteres e não pode ser o valor de desenvolvimento.",
    );
  }
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL", "postgresql://root:devpassword@localhost:5432/veiculo_scraper_dev"),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  port: Number(process.env.PORT ?? 3001),
  webOrigin: required("WEB_ORIGIN", "http://localhost:3000"),
  sessionSecret: sessionSecret(),
  /** Vazio = fallback `tel:`. Nunca logar. */
  wavoipDeviceToken: process.env.WAVOIP_DEVICE_TOKEN ?? "",
  wavoipWebhookSecret: process.env.WAVOIP_WEBHOOK_SECRET ?? "",
};

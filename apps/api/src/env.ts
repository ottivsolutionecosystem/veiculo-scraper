import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`variável de ambiente ausente: ${name}`);
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL", "postgresql://root:devpassword@localhost:5432/veiculo_scraper_dev"),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  port: Number(process.env.PORT ?? 3001),
  webOrigin: required("WEB_ORIGIN", "http://localhost:3000"),
};

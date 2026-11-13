/**
 * Server: API_URL (runtime Dokploy). Browser: mesma origem por padrão
 * (proxy /api). Nunca cair em localhost no browser — isso quebra prod.
 */
const LOCAL_API = "http://localhost:3001";

function browserApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  // undefined ou "" → mesma origem (crawler.ottiv.io/api → proxy).
  if (raw === undefined || raw === "") return "";
  return raw;
}

export const API_URL =
  typeof window === "undefined"
    ? process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || LOCAL_API
    : browserApiUrl();

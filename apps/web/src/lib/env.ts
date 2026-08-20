/**
 * Server Components leem `API_URL` em runtime (no Docker: http://api:3001).
 * O browser só vê `NEXT_PUBLIC_*` inlinado no build. String vazia = mesma
 * origem — o Caddy encaminha `/api` para a API.
 */
const LOCAL_API = "http://localhost:3001";

export const API_URL =
  typeof window === "undefined"
    ? process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || LOCAL_API
    : process.env.NEXT_PUBLIC_API_URL === ""
      ? ""
      : process.env.NEXT_PUBLIC_API_URL || LOCAL_API;

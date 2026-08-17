/**
 * Server Components (rodam no servidor) podem ler qualquer `process.env.*`
 * em runtime. Client Components (`"use client"`) só têm acesso ao que foi
 * inlinado em build com prefixo `NEXT_PUBLIC_` — por isso a distinção
 * abaixo em vez de uma única constante.
 */
export const API_URL =
  typeof window === "undefined"
    ? (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001");

import { NextRequest, NextResponse } from "next/server";

import { resetApiBaseCache, resolveApiBase } from "@/lib/api-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Encaminha /api/* para a Fastify (descobre hostname na rede Dokploy). */
const HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function proxy(req: NextRequest, ctx: { params: { path: string[] } }) {
  const parts = ctx.params.path ?? [];
  const pathAndQuery = `/api/${parts.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Buffer.from(await req.arrayBuffer());
  }

  let base = "(desconhecido)";
  try {
    base = await resolveApiBase();
    const upstream = await fetch(`${base}${pathAndQuery}`, init);
    const out = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP.has(key.toLowerCase())) out.set(key, value);
    });
    return new NextResponse(upstream.body, { status: upstream.status, headers: out });
  } catch (err) {
    resetApiBaseCache();
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[api-proxy] falhou", { base, pathAndQuery, detail });
    return NextResponse.json(
      {
        error:
          "API inacessível pelo painel. crawler-web e crawler-api precisam estar na mesma rede Dokploy.",
        apiUrl: base,
        detail,
      },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;

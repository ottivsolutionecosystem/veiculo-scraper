import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Encaminha /api/* para a Fastify em runtime (API_URL do Dokploy). */
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

function apiBase(): string {
  return (process.env.API_URL || "http://api:3001").replace(/\/$/, "");
}

async function proxy(req: NextRequest, ctx: { params: { path: string[] } }) {
  const base = apiBase();
  const parts = ctx.params.path ?? [];
  const target = `${base}/api/${parts.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Buffer.from(await req.arrayBuffer());
  }

  try {
    const upstream = await fetch(target, init);
    const out = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP.has(key.toLowerCase())) out.set(key, value);
    });
    return new NextResponse(upstream.body, { status: upstream.status, headers: out });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[api-proxy] falhou", { base, target, detail });
    return NextResponse.json(
      {
        error: "API inacessível pelo painel. Confira API_URL no crawler-web.",
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

import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_SECONDS = 60 * 60 * 24 * 14;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function signSession(operatorId: number, secret: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + TTL_SECONDS;
  const payload = `${operatorId}.${exp}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function readSession(token: string, secret: string, now = Date.now()): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [idRaw, expRaw, sig] = parts;
  if (!idRaw || !expRaw || !sig) return null;
  const payload = `${idRaw}.${expRaw}`;
  if (!sameText(sig, sign(payload, secret))) return null;
  if (Number(expRaw) < now / 1000) return null;
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export function cookieFromHeader(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

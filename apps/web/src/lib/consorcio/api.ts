import type { ConsorcioOffer } from "@veiculo/types";

import { ApiError } from "@/lib/api";
import { resolveApiBase } from "@/lib/api-upstream";
import { API_URL } from "@/lib/env";
import { getStoredToken } from "@/lib/session";

async function resolveFetchBase(): Promise<string> {
  if (typeof window !== "undefined") return API_URL;
  return resolveApiBase();
}

async function consorcioFetch<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getStoredToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  const base = await resolveFetchBase();
  const res = await fetch(`${base}${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const raw = await res.text();
    let message = `Erro ${res.status}`;
    try {
      const body = JSON.parse(raw) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      if (raw) message = raw.slice(0, 180);
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function listConsorcioOffers() {
  return consorcioFetch<{ items: ConsorcioOffer[] }>("/api/consorcio/offers");
}

export function createConsorcioOffer() {
  return consorcioFetch<ConsorcioOffer>("/api/consorcio/offers", { method: "POST" });
}

export function getConsorcioOffer(id: string) {
  return consorcioFetch<ConsorcioOffer>(`/api/consorcio/offers/${encodeURIComponent(id)}`);
}

export function patchConsorcioOffer(id: string, body: Partial<ConsorcioOffer>) {
  return consorcioFetch<ConsorcioOffer>(`/api/consorcio/offers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listConsorcioOffer(id: string) {
  return consorcioFetch<ConsorcioOffer>(`/api/consorcio/offers/${encodeURIComponent(id)}/list`, {
    method: "POST",
    body: "{}",
  });
}

export function addConsorcioProposal(
  id: string,
  body: { dealerName: string; amountCents: number; notes?: string | null },
) {
  return consorcioFetch<ConsorcioOffer>(
    `/api/consorcio/offers/${encodeURIComponent(id)}/proposals`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function getPublicConsorcioOffer(token: string) {
  return consorcioFetch<ConsorcioOffer>(
    `/api/consorcio/public/${encodeURIComponent(token)}`,
    undefined,
    false,
  );
}

export function patchPublicConsorcioOffer(token: string, body: Partial<ConsorcioOffer>) {
  return consorcioFetch<ConsorcioOffer>(
    `/api/consorcio/public/${encodeURIComponent(token)}`,
    { method: "PATCH", body: JSON.stringify(body) },
    false,
  );
}

import type { Operator } from "@veiculo/types";

export const SESSION_KEY = "veiculo-scraper:sessao";
export const OPERATOR_KEY = "veiculo-scraper:operador";
export const SESSION_COOKIE = "vs_sessao";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 14;

function cookieSecure(): string {
  return typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
}

function writeCookie(token: string | null) {
  if (typeof document === "undefined") return;
  if (token) {
    document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${cookieSecure()}`;
    return;
  }
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${cookieSecure()}`;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function getStoredOperator(): Operator | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(OPERATOR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Operator;
  } catch {
    return null;
  }
}

export function storeSession(token: string, operator?: Operator) {
  window.localStorage.setItem(SESSION_KEY, token);
  if (operator) window.localStorage.setItem(OPERATOR_KEY, JSON.stringify(operator));
  writeCookie(token);
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(OPERATOR_KEY);
  writeCookie(null);
}

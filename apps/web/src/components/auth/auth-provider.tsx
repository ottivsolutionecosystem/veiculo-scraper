"use client";

import * as React from "react";

import type { Operator } from "@veiculo/types";
import { ApiError, getMe, logout as apiLogout } from "@/lib/api";
import { clearSession, getStoredOperator, getStoredToken, storeSession } from "@/lib/session";

interface AuthContextValue {
  operator: Operator | null;
  ready: boolean;
  setSession: (token: string, operator: Operator) => void;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [operator, setOperator] = React.useState<Operator | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const token = getStoredToken();
    const cached = getStoredOperator();
    if (cached) setOperator(cached);
    if (!token) {
      setReady(true);
      return;
    }
    storeSession(token, cached ?? undefined);
    setReady(true);
    let cancelled = false;
    void getMe()
      .then((res) => {
        if (cancelled) return;
        storeSession(token, res.operator);
        setOperator(res.operator);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearSession();
          setOperator(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setSession(token: string, next: Operator) {
    storeSession(token, next);
    setOperator(next);
  }

  async function logout() {
    try {
      await apiLogout();
    } catch {
      // sessão local some mesmo se a API já estiver fora
    }
    clearSession();
    setOperator(null);
  }

  return (
    <AuthContext.Provider value={{ operator, ready, setSession, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa do AuthProvider");
  return ctx;
}

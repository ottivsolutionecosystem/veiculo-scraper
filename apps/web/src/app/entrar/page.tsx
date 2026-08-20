"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AuttusWordmark } from "@/components/brand/auttus-mark";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, getAuthStatus, login, setupFirstOperator } from "@/lib/api";
import { storeSession } from "@/lib/session";

export default function EntrarPage() {
  const { operator, ready, setSession } = useAuth();
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = React.useState(false);
  const [masterLogin, setMasterLogin] = React.useState("guilherme.sanches");
  const [name, setName] = React.useState("Guilherme Sanches");
  const [loginValue, setLoginValue] = React.useState("guilherme.sanches");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    void getAuthStatus().then((s) => {
      setNeedsSetup(s.needsSetup);
      setMasterLogin(s.masterLogin);
      setLoginValue(s.needsSetup ? s.masterLogin : "");
    });
  }, []);

  React.useEffect(() => {
    if (ready && operator) router.replace("/");
  }, [ready, operator, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = needsSetup
        ? await setupFirstOperator({ name, login: loginValue, password })
        : await login({ login: loginValue, password });
      storeSession(result.token, result.operator);
      setSession(result.token, result.operator);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-navy-deep/60 p-6 shadow-card">
        <AuttusWordmark onDark />
        <div>
          <h1 className="text-lg font-semibold text-white">
            {needsSetup ? "Criar o primeiro acesso" : "Entrar"}
          </h1>
          <p className="mt-1 text-sm text-white/55">
            {needsSetup
              ? `Só ${masterLogin} cria o primeiro acesso. Depois ele libera quem pode entrar.`
              : "Seu trabalho fica no seu nome. Quem não foi autorizado pelo master não entra."}
          </p>
        </div>
        <form className="space-y-3" onSubmit={(e) => void submit(e)}>
          {needsSetup && (
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-white/80">
                Seu nome
              </Label>
              <Input
                id="nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border-white/15 bg-white/5 text-white"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="login" className="text-white/80">
              Usuário
            </Label>
            <Input
              id="login"
              autoComplete="username"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              required
              minLength={3}
              readOnly={needsSetup}
              className="border-white/15 bg-white/5 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha" className="text-white/80">
              Senha
            </Label>
            <Input
              id="senha"
              type="password"
              autoComplete={needsSetup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="border-white/15 bg-white/5 text-white"
            />
          </div>
          {error && <p className="text-sm text-coral">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {needsSetup ? "Criar acesso" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}

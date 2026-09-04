"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, getAuthStatus, login, setupFirstOperator } from "@/lib/api";
import { storeSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-12 min-h-12 rounded-xl border-white/10 bg-white/[0.06] px-4 text-white shadow-none placeholder:text-white/25 focus-visible:border-white/25 focus-visible:ring-white/20";

export function EntrarForm() {
  const { operator, ready, setSession } = useAuth();
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = React.useState(false);
  const [name, setName] = React.useState("Guilherme Sanches");
  const [loginValue, setLoginValue] = React.useState("guilherme.sanches");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    void getAuthStatus().then((s) => {
      setNeedsSetup(s.needsSetup);
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
    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.07] p-6 shadow-[0_40px_80px_-24px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-8">
      <div className="auttus-gradient mb-6 h-px w-16" />
      <h2 className="text-2xl font-semibold tracking-tight text-white">
        {needsSetup ? "Criar o primeiro acesso" : "Bem-vindo de volta"}
      </h2>

      <form className="mt-8 space-y-4" onSubmit={(e) => void submit(e)}>
        {needsSetup && (
          <Field id="nome" label="Seu nome">
            <Input id="nome" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required className={fieldClass} />
          </Field>
        )}
        <Field id="login" label="Usuário">
          <Input
            id="login"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            required
            minLength={3}
            readOnly={needsSetup}
            className={fieldClass}
          />
        </Field>
        <Field id="senha" label="Senha">
          <div className="relative">
            <Input
              id="senha"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={needsSetup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={cn(fieldClass, "pr-12")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white/80"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {error && <p className="text-sm text-coral">{error}</p>}
        <Button
          type="submit"
          disabled={busy}
          className="auttus-gradient mt-2 h-12 w-full rounded-xl border-0 text-base font-semibold text-white shadow-[0_12px_32px_-8px_hsl(var(--orange)/0.55)] hover:opacity-95"
        >
          {busy && <Loader2 className="animate-spin" />}
          {needsSetup ? "Criar acesso" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[13px] text-white/65">
        {label}
      </Label>
      {children}
    </div>
  );
}

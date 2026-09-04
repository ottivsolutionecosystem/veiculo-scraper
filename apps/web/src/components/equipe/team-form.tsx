"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { ApiError, createOperator, getOperators, patchOperator } from "@/lib/api";
import type { Operator } from "@veiculo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function TeamForm() {
  const [items, setItems] = React.useState<Operator[]>([]);
  const [name, setName] = React.useState("");
  const [login, setLogin] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    void getOperators().then((res) => setItems(res.items));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await createOperator({ name, login, password });
      setItems((prev) => [...prev.filter((p) => p.id !== created.id), created].sort(byTeam));
      setName("");
      setLogin("");
      setPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não cadastrou o consignador.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(op: Operator, active: boolean) {
    try {
      const updated = await patchOperator(op.id, { active });
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não alterou o acesso.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="space-y-3 rounded-xl border bg-card p-4 shadow-card" onSubmit={(e) => void submit(e)}>
        <h2 className="text-sm font-semibold text-navy">Autorizar consignador</h2>
        <div className="space-y-1.5">
          <Label htmlFor="eq-nome">Nome</Label>
          <Input id="eq-nome" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eq-login">Usuário</Label>
          <Input
            id="eq-login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            minLength={3}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eq-senha">Senha inicial</Label>
          <Input
            id="eq-senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Liberar acesso
        </Button>
      </form>

      <div className="rounded-xl border bg-card p-4 shadow-card">
        <h2 className="text-sm font-semibold text-navy">Quem pode entrar</h2>
        <ul className="mt-3 divide-y">
          {items.map((op) => (
            <li key={op.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0">
                <span className="block font-medium text-navy">{op.name}</span>
                <span className="text-muted-foreground">{op.login}</span>
                {op.role === "master" && (
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-primary">master</span>
                )}
              </span>
              {op.role === "master" ? (
                <span className="text-xs text-muted-foreground">sempre ativo</span>
              ) : (
                <Switch
                  checked={op.active}
                  onCheckedChange={(next) => void toggle(op, next)}
                  aria-label={op.active ? `Desligar ${op.name}` : `Liberar ${op.name}`}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function byTeam(a: Operator, b: Operator) {
  if (a.role === "master" && b.role !== "master") return -1;
  if (b.role === "master" && a.role !== "master") return 1;
  return a.name.localeCompare(b.name, "pt-BR");
}

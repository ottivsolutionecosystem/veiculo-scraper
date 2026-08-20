"use client";

import * as React from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";

import { ApiError, getBranches, getSettings, getWebhooks } from "@/lib/api";
import type { BranchWithLoad, SettingsResponse } from "@/lib/api-types";
import type { Webhook } from "@veiculo/types";
import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { SettingsForm } from "@/components/settings/settings-form";

export function SettingsBoard() {
  const { ready, operator } = useAuth();
  const [settings, setSettings] = React.useState<SettingsResponse | null>(null);
  const [branches, setBranches] = React.useState<BranchWithLoad[]>([]);
  const [webhooks, setWebhooks] = React.useState<Webhook[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!ready || !operator) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([getSettings(), getBranches(), getWebhooks()])
      .then(([nextSettings, nextBranches, nextWebhooks]) => {
        if (cancelled) return;
        setSettings(nextSettings);
        setBranches(nextBranches);
        setWebhooks(nextWebhooks);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Não carregou os ajustes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, operator]);

  if (!ready) return null;
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando ajustes…
      </div>
    );
  }
  if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <p className="text-sm text-muted-foreground">
        Pesos, faixas, regras de descarte, cadência, templates e integrações — editáveis sem deploy (princípio 2
        do SPEC).
      </p>
      {settings === null ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="Nenhuma configuração salva ainda"
          description="Rode o seed inicial ou salve a primeira versão de ajustes para começar."
        />
      ) : (
        <SettingsForm initial={settings} branches={branches} webhooks={webhooks} />
      )}
    </div>
  );
}

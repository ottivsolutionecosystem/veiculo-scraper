"use client";

import * as React from "react";
import type { Settings } from "@veiculo/types";
import { Loader2, Save } from "lucide-react";

import type { BranchWithLoad } from "@/lib/api-types";
import { putSettings, ApiError } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeightsTab } from "@/components/settings/weights-tab";
import { RulesTab } from "@/components/settings/rules-tab";
import { CurveTemplateTab } from "@/components/settings/curve-template-tab";
import { BranchesWebhooksTab } from "@/components/settings/branches-webhooks-tab";

export function SettingsForm({
  initial,
  branches,
  webhooks,
}: {
  initial: Settings;
  branches: BranchWithLoad[];
  webhooks: import("@veiculo/types").Webhook[];
}) {
  const [draft, setDraft] = React.useState(initial);
  const [author, setAuthor] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function patch(p: Partial<Settings>) {
    setDraft((d) => ({ ...d, ...p }));
    setSavedAt(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const saved = await putSettings({ ...draft, author: author || "operador" });
      setDraft(saved);
      setSavedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao salvar ajustes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pesos">
        <TabsList>
          <TabsTrigger value="pesos">Pesos e faixas</TabsTrigger>
          <TabsTrigger value="regras">Descarte e cadência</TabsTrigger>
          <TabsTrigger value="templates">Curva e templates</TabsTrigger>
          <TabsTrigger value="integracoes">Unidades e webhooks</TabsTrigger>
        </TabsList>
        <TabsContent value="pesos">
          <WeightsTab draft={draft} onChange={patch} />
        </TabsContent>
        <TabsContent value="regras">
          <RulesTab draft={draft} onChange={patch} />
        </TabsContent>
        <TabsContent value="templates">
          <CurveTemplateTab draft={draft} onChange={patch} />
        </TabsContent>
        <TabsContent value="integracoes">
          <BranchesWebhooksTab branches={branches} webhooks={webhooks} />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-navy/[0.06] bg-card p-4 shadow-card">
        <div className="space-y-1">
          <Label>Autor da alteração</Label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="seu nome" className="w-48" />
        </div>
        <Button onClick={save} disabled={saving} className="mt-5">
          {saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar alterações
        </Button>
        {savedAt && <p className="mt-5 text-sm text-boa">Salvo — nova versão gravada.</p>}
        {error && <p className="mt-5 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

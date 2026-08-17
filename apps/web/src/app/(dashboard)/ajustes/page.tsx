import { getSettings, getBranches, getWebhooks } from "@/lib/api";
import { EmptyState } from "@/components/shared/empty-state";
import { SettingsForm } from "@/components/settings/settings-form";
import { SlidersHorizontal } from "lucide-react";

export default async function AjustesPage() {
  const [settings, branches, webhooks] = await Promise.all([getSettings(), getBranches(), getWebhooks()]);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">
          Pesos, faixas, regras de descarte, cadência, templates e integrações — editáveis sem
          deploy (princípio 2 do SPEC).
        </p>
      </div>

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

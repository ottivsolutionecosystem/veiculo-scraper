import { SETTINGS, BRANCHES, WEBHOOKS } from "@/mocks";
import { getDemoState, delay, DemoError } from "@/lib/demo-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WeightsTab } from "@/components/settings/weights-tab";
import { RulesTab } from "@/components/settings/rules-tab";
import { CurveTemplateTab } from "@/components/settings/curve-template-tab";
import { BranchesWebhooksTab } from "@/components/settings/branches-webhooks-tab";

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const demo = getDemoState(searchParams);
  if (demo === "error") throw new DemoError("Ajustes");
  if (demo === "loading") await delay(900);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">
          Pesos, faixas, regras de descarte, cadência, templates e integrações — editáveis sem
          deploy (princípio 2 do SPEC).
        </p>
      </div>

      <Tabs defaultValue="pesos">
        <TabsList>
          <TabsTrigger value="pesos">Pesos e faixas</TabsTrigger>
          <TabsTrigger value="regras">Descarte e cadência</TabsTrigger>
          <TabsTrigger value="templates">Curva e templates</TabsTrigger>
          <TabsTrigger value="integracoes">Unidades e webhooks</TabsTrigger>
        </TabsList>
        <TabsContent value="pesos">
          <WeightsTab settings={SETTINGS} />
        </TabsContent>
        <TabsContent value="regras">
          <RulesTab settings={SETTINGS} />
        </TabsContent>
        <TabsContent value="templates">
          <CurveTemplateTab settings={SETTINGS} />
        </TabsContent>
        <TabsContent value="integracoes">
          <BranchesWebhooksTab
            branches={demo === "empty" ? [] : BRANCHES}
            webhooks={demo === "empty" ? [] : WEBHOOKS}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

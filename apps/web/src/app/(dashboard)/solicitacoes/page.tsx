import { ClipboardList } from "lucide-react";

import { getRequests, getBranches } from "@/lib/api";
import { EmptyState } from "@/components/shared/empty-state";
import { RequestsKanban } from "@/components/requests/kanban";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export default async function SolicitacoesPage() {
  const [requestsPage, branches] = await Promise.all([
    getRequests({ limit: 100 }),
    getBranches(),
  ]);
  const requests = requestsPage.items;

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Solicitações de captação</h1>
        <p className="text-sm text-muted-foreground">
          {requests.length}
          {requestsPage.nextCursor ? "+" : ""} solicitações
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma solicitação em andamento"
          description="Solicite um veículo na loja a partir da ficha do veículo para começar o fluxo de recepção."
        />
      ) : (
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="unidade">Por unidade</TabsTrigger>
          </TabsList>
          <TabsContent value="kanban">
            <RequestsKanban requests={requests} branches={branches} />
          </TabsContent>
          <TabsContent value="unidade" className="space-y-4">
            {branches.map((branch) => {
              const branchRequests = requests.filter((r) => r.branchId === branch.id);
              return (
                <Card key={branch.id} className="p-4">
                  <p className="font-semibold">{branch.name}</p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Limite de {branch.intakeLimitPerPeriod} veículos por período · {branch.address}
                  </p>
                  {branchRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma solicitação nesta unidade.</p>
                  ) : (
                    <div className="space-y-1">
                      {branchRequests.map((r) => (
                        <div key={r.id} className="flex justify-between text-sm">
                          <span>{r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model}` : `#${r.id}`}</span>
                          <span className="text-muted-foreground">{formatDate(r.proposedAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

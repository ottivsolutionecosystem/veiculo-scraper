import { ClipboardList } from "lucide-react";

import { REQUESTS, BRANCHES, VEHICLES, vehicleById, primaryListing } from "@/mocks";
import { getDemoState, delay, DemoError } from "@/lib/demo-state";
import { EmptyState } from "@/components/shared/empty-state";
import { RequestsKanban } from "@/components/requests/kanban";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export default async function SolicitacoesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const demo = getDemoState(searchParams);
  if (demo === "error") throw new DemoError("Solicitações");
  if (demo === "loading") await delay(900);

  const requests = demo === "empty" ? [] : REQUESTS;
  const vehicleMap = new Map(VEHICLES.map((v) => [v.id, v]));
  const branchMap = new Map(BRANCHES.map((b) => [b.id, b]));

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Solicitações de captação</h1>
        <p className="text-sm text-muted-foreground">{requests.length} solicitações</p>
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
            <RequestsKanban requests={requests} vehicles={vehicleMap} branches={branchMap} />
          </TabsContent>
          <TabsContent value="unidade" className="space-y-4">
            {BRANCHES.map((branch) => {
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
                      {branchRequests.map((r) => {
                        const vehicle = vehicleById(r.vehicleId);
                        const listing = vehicle ? primaryListing(vehicle) : undefined;
                        return (
                          <div key={r.id} className="flex justify-between text-sm">
                            <span>{listing ? `${listing.brand} ${listing.model}` : r.id}</span>
                            <span className="text-muted-foreground">{formatDate(r.proposedAt)}</span>
                          </div>
                        );
                      })}
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

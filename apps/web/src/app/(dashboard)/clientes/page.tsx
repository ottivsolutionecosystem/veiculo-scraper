import Link from "next/link";
import { Users } from "lucide-react";

import { CUSTOMERS, interestsByCustomer, matchesByInterest } from "@/mocks";
import { getDemoState, delay, DemoError } from "@/lib/demo-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INTEREST_PRIORITY_LABELS } from "@/lib/labels";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const demo = getDemoState(searchParams);
  if (demo === "error") throw new DemoError("Clientes e interesses");
  if (demo === "loading") await delay(900);

  const customers = demo === "empty" ? [] : CUSTOMERS;

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Clientes e interesses</h1>
        <p className="text-sm text-muted-foreground">{customers.length} clientes cadastrados</p>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente cadastrado"
          description="Cadastre um comprador interessado para começar a casar veículos automaticamente."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer) => {
            const interests = interestsByCustomer(customer.id);
            const matchCount = interests.reduce((sum, i) => sum + matchesByInterest(i.id).length, 0);
            return (
              <Link key={customer.id} href={`/clientes/${customer.id}`}>
                <Card className="h-full p-4 hover:bg-accent">
                  <p className="font-semibold">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">{customer.source} · {customer.owner}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {interests.map((i) => (
                      <Badge key={i.id} variant="outline">
                        {i.brand ?? "qualquer marca"} · {INTEREST_PRIORITY_LABELS[i.priority]}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-2 text-sm">
                    {matchCount > 0 ? (
                      <span className="text-boa">{matchCount} carros compatíveis agora</span>
                    ) : (
                      <span className="text-muted-foreground">Nenhum carro compatível ainda</span>
                    )}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

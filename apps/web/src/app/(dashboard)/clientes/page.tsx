import Link from "next/link";
import { Users } from "lucide-react";

import { getCustomers } from "@/lib/api";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";

export default async function ClientesPage() {
  const page = await getCustomers({ limit: 60 });

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Clientes e interesses</h1>
        <p className="text-sm text-muted-foreground">
          {page.items.length}
          {page.nextCursor ? "+" : ""} clientes cadastrados
        </p>
      </div>

      {page.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente cadastrado"
          description="Cadastre um comprador interessado para começar a casar veículos automaticamente."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {page.items.map((customer) => (
            <Link key={customer.id} href={`/clientes/${customer.id}`}>
              <Card className="h-full p-4 hover:bg-accent">
                <p className="font-semibold">{customer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {customer.source} · {customer.owner}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {customer.totalInterests} interesse{customer.totalInterests === 1 ? "" : "s"} cadastrado
                  {customer.totalInterests === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-sm">
                  {customer.totalMatches > 0 ? (
                    <span className="text-boa">{customer.totalMatches} carros compatíveis agora</span>
                  ) : (
                    <span className="text-muted-foreground">Nenhum carro compatível ainda</span>
                  )}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { UserRound } from "lucide-react";

import { SELLERS } from "@/mocks";
import { getDemoState, delay, DemoError } from "@/lib/demo-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function VendedoresPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const demo = getDemoState(searchParams);
  if (demo === "error") throw new DemoError("Vendedores");
  if (demo === "loading") await delay(900);

  const sellers = demo === "empty" ? [] : [...SELLERS].sort((a, b) => b.totalListings - a.totalListings);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Vendedores</h1>
        <p className="text-sm text-muted-foreground">{sellers.length} vendedores com anúncios ativos</p>
      </div>

      {sellers.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Nenhum vendedor ainda"
          description="Vendedores aparecem aqui assim que o coletor traz o primeiro anúncio deles."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Anúncios</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellers.map((seller) => (
              <TableRow key={seller.id}>
                <TableCell>
                  <Link href={`/vendedores/${seller.id}`} className="font-medium text-primary hover:underline">
                    {seller.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{seller.maskedPhone}</TableCell>
                <TableCell>{seller.totalListings}</TableCell>
                <TableCell className="flex gap-1.5">
                  {seller.muted && <Badge variant="secondary">Mutado</Badge>}
                  {seller.doNotDisturb && <Badge variant="secondary">Não perturbe</Badge>}
                  {!seller.muted && !seller.doNotDisturb && <Badge variant="outline">Ativo</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

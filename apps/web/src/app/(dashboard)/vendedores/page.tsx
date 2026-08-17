import Link from "next/link";
import { UserRound } from "lucide-react";

import { getSellers } from "@/lib/api";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function VendedoresPage() {
  const page = await getSellers({ limit: 100 });

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Vendedores</h1>
        <p className="text-sm text-muted-foreground">
          {page.items.length}
          {page.nextCursor ? "+" : ""} vendedores com anúncios ativos
        </p>
      </div>

      {page.items.length === 0 ? (
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
            {page.items.map((seller) => (
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

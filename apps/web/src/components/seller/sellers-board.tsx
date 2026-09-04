"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, UserRound } from "lucide-react";

import { ApiError, getSellers } from "@/lib/api";
import type { SellerListItem } from "@/lib/api-types";
import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function SellersBoard() {
  const { ready, operator } = useAuth();
  const [items, setItems] = React.useState<SellerListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!ready || !operator) return;
    let cancelled = false;
    void getSellers({ limit: 100 })
      .then((page) => {
        if (!cancelled) setItems(page.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Não carregou os vendedores.");
      });
    return () => {
      cancelled = true;
    };
  }, [ready, operator]);

  if (!ready) return null;
  if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;
  if (!items) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando vendedores…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {items.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Nenhum vendedor ainda"
          description="Vendedores aparecem aqui assim que o coletor traz o primeiro anúncio deles."
        />
      ) : (
        <>
        <div className="space-y-2 md:hidden">
          {items.map((seller) => (
            <Link
              key={seller.id}
              href={`/vendedores/${seller.id}`}
              className="card-lift block rounded-2xl border border-navy/[0.06] bg-card p-3.5 shadow-card"
            >
              <p className="font-semibold tracking-tight text-navy">{seller.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {seller.maskedPhone ?? "sem telefone"} · {seller.totalListings} anúncios
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {seller.muted && <Badge variant="secondary">Mutado</Badge>}
                {seller.doNotDisturb && <Badge variant="secondary">Não perturbe</Badge>}
                {!seller.muted && !seller.doNotDisturb && <Badge variant="outline">Ativo</Badge>}
              </div>
            </Link>
          ))}
        </div>
        <div className="hidden overflow-hidden rounded-2xl border border-navy/[0.06] bg-card shadow-card md:block">
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
              {items.map((seller) => (
                <TableRow key={seller.id}>
                  <TableCell>
                    <Link href={`/vendedores/${seller.id}`} className="font-medium text-primary hover:underline">
                      {seller.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{seller.maskedPhone ?? "sem telefone"}</TableCell>
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
        </div>
        </>
      )}
    </div>
  );
}

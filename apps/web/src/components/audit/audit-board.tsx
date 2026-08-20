"use client";

import * as React from "react";
import { Loader2, ScrollText } from "lucide-react";

import { ApiError, getAudit } from "@/lib/api";
import type { AuditRecord } from "@veiculo/types";
import { AUDIT_ACTION_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function AuditBoard() {
  const { ready, operator } = useAuth();
  const [items, setItems] = React.useState<AuditRecord[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!ready || !operator) return;
    let cancelled = false;
    void getAudit({ limit: 100 })
      .then((page) => {
        if (!cancelled) setItems(page.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Não carregou a auditoria.");
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
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando auditoria…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <p className="text-sm text-muted-foreground">
        Quem revelou contato, quem descartou, quem mudou peso — registro completo e imutável.
      </p>
      {items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nenhum registro de auditoria"
          description="Ações sensíveis (revelar contato, descartar, mudar peso) aparecem aqui assim que acontecem."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Alvo</TableHead>
                <TableHead>Detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(record.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{AUDIT_ACTION_LABELS[record.action]}</Badge>
                  </TableCell>
                  <TableCell>{record.author}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {record.targetType}/{record.targetId}
                  </TableCell>
                  <TableCell className="max-w-md">{record.detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

import { ScrollText } from "lucide-react";

import { getAudit } from "@/lib/api";
import { AUDIT_ACTION_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AuditoriaPage() {
  const page = await getAudit({ limit: 100 });

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Quem revelou contato, quem descartou, quem mudou peso — registro completo e imutável.
        </p>
      </div>

      {page.items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nenhum registro de auditoria"
          description="Ações sensíveis (revelar contato, descartar, mudar peso) aparecem aqui assim que acontecem."
        />
      ) : (
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
            {page.items.map((record) => (
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
      )}
    </div>
  );
}

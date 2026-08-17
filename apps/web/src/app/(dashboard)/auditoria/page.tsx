import { ScrollText } from "lucide-react";

import { AUDIT_RECORDS } from "@/mocks";
import { getDemoState, delay, DemoError } from "@/lib/demo-state";
import { AUDIT_ACTION_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const demo = getDemoState(searchParams);
  if (demo === "error") throw new DemoError("Auditoria");
  if (demo === "loading") await delay(900);

  const records =
    demo === "empty"
      ? []
      : [...AUDIT_RECORDS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Quem revelou contato, quem descartou, quem mudou peso — registro completo e imutável.
        </p>
      </div>

      {records.length === 0 ? (
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
            {records.map((record) => (
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

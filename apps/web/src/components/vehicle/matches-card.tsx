import Link from "next/link";
import type { InterestMatch } from "@veiculo/types";
import { Users } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = InterestMatch & { customer: { id: number; name: string } };

export function MatchesCard({ rows }: { rows: Row[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" /> Clientes compatíveis ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cliente com interesse compatível ainda.</p>
        ) : (
          rows.map((row) => (
            <Link
              key={row.id}
              href={`/clientes/${row.customer.id}`}
              className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
            >
              <span>{row.customer.name}</span>
              <Badge variant="outline">{row.matchScore}% aderência</Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

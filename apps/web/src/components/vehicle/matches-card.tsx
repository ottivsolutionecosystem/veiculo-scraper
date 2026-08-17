import Link from "next/link";
import type { InterestMatch, Interest, Customer } from "@veiculo/types";
import { Users } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Row {
  match: InterestMatch;
  interest: Interest;
  customer: Customer;
}

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
          rows.map(({ match, customer }) => (
            <Link
              key={match.id}
              href={`/clientes/${customer.id}`}
              className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
            >
              <span>{customer.name}</span>
              <Badge variant="outline">{match.matchScore}% aderência</Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

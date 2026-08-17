import type { Listing } from "@veiculo/types";
import { Link2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/format";

export function ListingsCard({ listings }: { listings: Listing[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Anúncios ligados ({listings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {listings.map((listing) => (
          <a
            key={listing.id}
            href={listing.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
          >
            <span className="flex items-center gap-2">
              <Badge variant="outline">{listing.source}</Badge>
              {!listing.active && <Badge variant="secondary">Inativo</Badge>}
            </span>
            <span className="font-medium">{formatCents(listing.priceCents)}</span>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

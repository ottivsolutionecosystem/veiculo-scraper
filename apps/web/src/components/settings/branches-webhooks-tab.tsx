import type { Branch, Webhook } from "@veiculo/types";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

export function BranchesWebhooksTab({ branches, webhooks }: { branches: Branch[]; webhooks: Webhook[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Unidades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {branches.map((b) => (
            <div key={b.id} className="rounded-md border p-2 text-sm">
              <p className="font-medium">{b.name}</p>
              <p className="text-xs text-muted-foreground">{b.address}</p>
              <p className="text-xs text-muted-foreground">
                Limite: {b.intakeLimitPerPeriod} veículos/período
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks de saída</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {webhooks.map((w) => (
            <div key={w.id} className="space-y-1 rounded-md border p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="truncate font-mono text-xs">{w.url}</span>
                <Badge variant={w.active ? "boa" : "outline"}>{w.active ? "Ativo" : "Inativo"}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {w.events.map((e) => (
                  <Badge key={e} variant="outline">
                    {e}
                  </Badge>
                ))}
              </div>
              {w.lastDeliveryAt && (
                <p className="text-xs text-muted-foreground">
                  Última entrega: {formatDateTime(w.lastDeliveryAt)} · HTTP {w.lastDeliveryStatus}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

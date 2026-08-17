"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { ScrapeRequest } from "@/lib/api-types";
import { triggerScrapeRun, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const SELLER_TYPE_LABELS: Record<"individual" | "dealer", string> = {
  individual: "Particular",
  dealer: "Loja",
};

export function RunScrapeButton({
  source,
  locked,
  pendingRequest,
}: {
  source: string;
  locked: boolean;
  pendingRequest: ScrapeRequest | null;
}) {
  const router = useRouter();
  const [sellerType, setSellerType] = React.useState<string>("");
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (locked) {
    return <p className="text-xs text-muted-foreground">Coleta sob demanda indisponível para esta fonte.</p>;
  }

  if (pendingRequest) {
    return (
      <p className="text-xs text-muted-foreground">
        Pedido pendente ({pendingRequest.sellerType ? SELLER_TYPE_LABELS[pendingRequest.sellerType] : "ambos"}) desde{" "}
        {formatDateTime(pendingRequest.requestedAt)} — aguardando o coletor rodar.
      </p>
    );
  }

  async function run() {
    setRunning(true);
    setError(null);
    try {
      await triggerScrapeRun(source, {
        sellerType: sellerType === "individual" || sellerType === "dealer" ? sellerType : undefined,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao pedir a coleta.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={sellerType} onValueChange={setSellerType}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Particular e loja" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="individual">Só particular</SelectItem>
          <SelectItem value="dealer">Só loja</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={run} disabled={running}>
        {running ? <Loader2 className="animate-spin" /> : <Play />} Rodar coleta agora
      </Button>
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </div>
  );
}

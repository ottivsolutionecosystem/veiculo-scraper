"use client";

import * as React from "react";
import { Play, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { ScrapeRequest } from "@/lib/api-types";
import { triggerScrapeRun, ApiError } from "@/lib/api";
import { ScrapeProgress } from "@/components/sources/scrape-progress";

export function RunScrapeButton({
  source,
  locked,
  pendingRequest,
  onRefresh,
}: {
  source: string;
  locked: boolean;
  pendingRequest: ScrapeRequest | null;
  onRefresh?: () => void;
}) {
  const [sellerType, setSellerType] = React.useState<string>("individual");
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (locked) {
    return <p className="text-xs text-muted-foreground">Coleta sob demanda indisponível para esta fonte.</p>;
  }

  if (pendingRequest) {
    return <ScrapeProgress request={pendingRequest} onRefresh={onRefresh} />;
  }

  async function run() {
    setRunning(true);
    setError(null);
    try {
      await triggerScrapeRun(source, {
        sellerType: sellerType === "individual" || sellerType === "dealer" ? sellerType : undefined,
      });
      onRefresh?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao pedir a coleta.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={sellerType} onValueChange={setSellerType}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Só particular" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="individual">Só particular</SelectItem>
          <SelectItem value="dealer">Só loja</SelectItem>
          <SelectItem value="all">Particular e loja</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" className="min-h-11" onClick={run} disabled={running}>
        {running ? <Loader2 className="animate-spin" /> : <Play />} Rodar coleta agora
      </Button>
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </div>
  );
}

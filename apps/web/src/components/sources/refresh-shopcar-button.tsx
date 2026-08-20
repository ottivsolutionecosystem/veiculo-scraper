"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { triggerScrapeRun, getSources, ApiError } from "@/lib/api";
import type { ScrapeRequest, SourceWithLastRun } from "@/lib/api-types";
import { ScrapeProgress } from "@/components/sources/scrape-progress";
import { formatDateTime } from "@/lib/format";

/** Dispara a sincronização Shopcar: mantém o que está no ar, marca o que
 * saiu, grava mudança de preço. O coletor Python é quem executa. */
export function RefreshShopcarButton({
  sellerType = "individual",
}: {
  sellerType?: "individual" | "dealer";
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<ScrapeRequest | null>(null);
  const [shopcar, setShopcar] = React.useState<SourceWithLastRun | null>(null);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const tinhaPedido = React.useRef(false);

  const carregar = React.useCallback(async () => {
    const sources = await getSources();
    const fonte = sources.find((s) => s.source === "shopcar") ?? null;
    setShopcar(fonte);
    setPending(fonte?.pendingRequest ?? null);
    return fonte?.pendingRequest ?? null;
  }, []);

  React.useEffect(() => {
    void carregar().then((pedido) => {
      tinhaPedido.current = pedido !== null;
    });
  }, [carregar]);

  React.useEffect(() => {
    if (!pending) {
      if (tinhaPedido.current) {
        tinhaPedido.current = false;
        router.refresh();
      }
      return;
    }
    tinhaPedido.current = true;
    const id = setInterval(() => void carregar(), 3000);
    return () => clearInterval(id);
  }, [pending, carregar, router]);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      await triggerScrapeRun("shopcar", { sellerType });
      tinhaPedido.current = true;
      await carregar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não deu para pedir a busca.");
    } finally {
      setRunning(false);
    }
  }

  const last = shopcar?.lastRun;
  const filtro = sellerType === "dealer" ? "lojas" : "particulares";

  return (
    <div className="flex min-w-[16rem] flex-col items-end gap-1.5">
      {pending ? (
        <div className="w-full max-w-sm">
          <ScrapeProgress request={pending} />
        </div>
      ) : (
        <>
          <Button size="sm" onClick={run} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar busca
          </Button>
          {last && (
            <p className="max-w-sm text-right text-xs text-muted-foreground">
              Última sincronização {formatDateTime(last.finishedAt)}: {last.new} novos · {last.updated}{" "}
              atualizados · {last.priceChanges} mudaram de preço · {last.deactivated} saíram do ar
            </p>
          )}
          <p className="text-right text-[11px] text-muted-foreground">
            Sincroniza {filtro} do Shopcar: quem continua no ar fica, quem saiu some da fila, mudança de
            valor aparece no card.
          </p>
        </>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

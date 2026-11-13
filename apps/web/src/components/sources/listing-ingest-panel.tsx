"use client";

import * as React from "react";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ApiError, enqueueListingIngest, getListingIngest } from "@/lib/api";
import type { ListingIngestItem } from "@/lib/api-types";
import { formatDateTime } from "@/lib/format";
import { splitHtmlDocuments } from "@/lib/listing-ingest";

const MAX_PAGES = 10;

/**
 * Cola HTML da busca Shopcar (já aberto no browser). O painel só enfileira;
 * o coletor Python processa sem GET na fonte.
 */
export function ListingIngestPanel({
  source,
  pendingCount = 0,
  onRefresh,
}: {
  source: string;
  pendingCount?: number;
  onRefresh?: () => void | Promise<unknown>;
}) {
  const [html, setHtml] = React.useState("");
  const [pageFrom, setPageFrom] = React.useState("1");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [recent, setRecent] = React.useState<ListingIngestItem[]>([]);

  const reloadRecent = React.useCallback(() => {
    return getListingIngest(source)
      .then((res) => setRecent(res.items.slice(0, 8)))
      .catch(() => {
        /* silencioso: histórico é opcional */
      });
  }, [source]);

  React.useEffect(() => {
    reloadRecent();
  }, [reloadRecent, pendingCount]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const chunks = splitHtmlDocuments(html);
    if (chunks.length === 0) {
      setError("Cole o HTML de pelo menos uma página de busca (Salvar como… ou Ctrl+U).");
      return;
    }
    if (chunks.length > MAX_PAGES) {
      setError(`No máximo ${MAX_PAGES} páginas por envio. Você colou ${chunks.length}.`);
      return;
    }
    const start = Math.max(1, Number.parseInt(pageFrom, 10) || 1);
    setBusy(true);
    try {
      const res = await enqueueListingIngest(
        source,
        chunks.map((doc, i) => ({ html: doc, page: start + i })),
      );
      setHtml("");
      setMessage(
        `${res.queued} página(s) na fila. O coletor processa em seguida (loop de ~15s).`,
      );
      await reloadRecent();
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não enfileirou a listagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-navy/[0.06] pt-3">
      <div>
        <p className="text-xs font-medium text-navy">Ingestão assistida (listagem)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No Shopcar, abra a busca, salve o HTML da página (ou cole o código-fonte). Pode colar
          várias páginas de uma vez (até {MAX_PAGES}). Sem GET automático — a Cloudflare fica no
          seu navegador.
        </p>
        {pendingCount > 0 && (
          <p className="mt-1 text-xs text-amber-700">
            {pendingCount} página(s) aguardando o coletor.
          </p>
        )}
      </div>
      <form onSubmit={onSubmit} className="space-y-2">
        <label className="block space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Número da 1ª página neste lote
          </span>
          <Input
            type="number"
            min={1}
            value={pageFrom}
            onChange={(ev) => setPageFrom(ev.target.value)}
            className="h-8 w-24"
          />
        </label>
        <Textarea
          value={html}
          onChange={(ev) => setHtml(ev.target.value)}
          placeholder="Cole aqui o HTML de busca.php?…&pagina=N (um ou vários documentos)."
          className="min-h-[120px] font-mono text-[11px]"
        />
        <Button type="submit" size="sm" disabled={busy || !html.trim()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Enfileirar listagem
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      {recent.length > 0 && (
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          {recent.map((item) => (
            <li key={item.id} className="rounded-md bg-navy/[0.03] px-2 py-1">
              #{item.id}
              {item.page != null ? ` · pág. ${item.page}` : ""} · {formatDateTime(item.requestedAt)}
              {item.processedAt
                ? ` · ok: ${item.result.new} novos / ${item.result.updated} atualizados / ${item.result.errors} erros`
                : item.startedAt
                  ? " · processando…"
                  : " · na fila"}
              {item.error ? ` · erro: ${item.error}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

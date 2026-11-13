"use client";

import * as React from "react";
import { AlertTriangle, Link2, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ApiError, enqueueListingIngest, getListingIngest } from "@/lib/api";
import type { ListingIngestItem } from "@/lib/api-types";
import { formatDateTime } from "@/lib/format";
import { getStoredToken } from "@/lib/session";
import {
  buildListingCaptureBookmarklet,
  buildShopcarListingUrlRange,
  parseShopcarListingUrls,
  splitHtmlDocuments,
  validateListingHtmlChunk,
  type ShopcarListingUrl,
} from "@/lib/listing-ingest";

const MAX_PAGES = 10;
/** Loop do coletor é ~15s; acima disso sem `startedAt` = serviço parado. */
const STALE_MS = 90_000;
const POLL_MS = 3000;

const DEFAULT_BASE =
  "https://www.shopcar.com.br/busca.php?tipo=1&tipoanuncio=2&pagina=1";

/**
 * Cola HTML da busca Shopcar (já aberto no browser). O painel só enfileira;
 * o coletor Python processa sem GET na fonte.
 * Alternativa: lista de links + bookmarklet (Cloudflare bloqueia GET do servidor).
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
  const [mode, setMode] = React.useState<"html" | "links">("links");
  const [html, setHtml] = React.useState("");
  const [pageFrom, setPageFrom] = React.useState("1");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [recent, setRecent] = React.useState<ListingIngestItem[]>([]);
  const [now, setNow] = React.useState(() => Date.now());

  const [baseUrl, setBaseUrl] = React.useState(DEFAULT_BASE);
  const [rangeFrom, setRangeFrom] = React.useState("1");
  const [rangeTo, setRangeTo] = React.useState("10");
  const [pastedLinks, setPastedLinks] = React.useState("");
  const [urlQueue, setUrlQueue] = React.useState<ShopcarListingUrl[]>([]);
  const [bookmarklet, setBookmarklet] = React.useState<string | null>(null);

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

  const waiting = recent.some((item) => !item.processedAt);
  React.useEffect(() => {
    if (!waiting) return;
    const tick = setInterval(() => setNow(Date.now()), POLL_MS);
    const poll = setInterval(() => {
      void reloadRecent();
      void onRefresh?.();
    }, POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [waiting, reloadRecent, onRefresh]);

  const staleWaiting = recent.some((item) => {
    if (item.processedAt || item.startedAt) return false;
    const t = Date.parse(item.requestedAt);
    return Number.isFinite(t) && now - t >= STALE_MS;
  });

  function armLinkQueue() {
    setError(null);
    setMessage(null);
    setBookmarklet(null);
    try {
      const fromPaste = parseShopcarListingUrls(pastedLinks);
      const from = Math.max(1, Number.parseInt(rangeFrom, 10) || 1);
      const to = Math.max(from, Number.parseInt(rangeTo, 10) || from);
      const fromRange = pastedLinks.trim()
        ? fromPaste
        : buildShopcarListingUrlRange(baseUrl, from, to);
      if (fromRange.length === 0) {
        setError("Nenhum link de busca.php do Shopcar. Cole URLs ou use o intervalo.");
        return;
      }
      const token = getStoredToken();
      if (!token) {
        setError("Sessão expirada — entre de novo e gere o capturador.");
        return;
      }
      const apiOrigin = window.location.origin;
      const href = buildListingCaptureBookmarklet({
        apiOrigin,
        token,
        source,
        urls: fromRange,
      });
      setUrlQueue(fromRange);
      setBookmarklet(href);
      setMessage(
        `${fromRange.length} link(s) armados. Arraste o botão “Capturar listagem” para a barra de favoritos, abra a 1ª página no Shopcar e clique no favorito em cada página (ele envia o HTML e abre a próxima).`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Não montou a lista de links.");
    }
  }

  async function onSubmitHtml(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const chunks = splitHtmlDocuments(html);
    if (chunks.length === 0) {
      setError(
        "Cole o HTML completo da busca. No Chrome: abra a página → Ctrl+U (código-fonte) → Ctrl+A → Ctrl+C. Não copie um pedaço do inspetor (F12).",
      );
      return;
    }
    if (chunks.length > MAX_PAGES) {
      setError(`No máximo ${MAX_PAGES} páginas por envio. Você colou ${chunks.length}.`);
      return;
    }
    for (let i = 0; i < chunks.length; i++) {
      const problem = validateListingHtmlChunk(chunks[i]!);
      if (problem) {
        setError(`Página ${i + 1} do lote: ${problem}`);
        return;
      }
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
          O servidor <strong className="font-medium">não</strong> baixa o Shopcar (Cloudflare). O HTML
          tem que sair do <strong className="font-medium">seu</strong> browser — por links + favorito
          capturador, ou colando o Ctrl+U.
        </p>
        <div className="mt-2 flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "links" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setMode("links")}
          >
            <Link2 className="h-3 w-3" />
            Links
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "html" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setMode("html")}
          >
            Colar HTML
          </Button>
        </div>
        {pendingCount > 0 && !staleWaiting && (
          <p className="mt-1 text-xs text-amber-700">
            {pendingCount} página(s) aguardando o coletor.
          </p>
        )}
        {staleWaiting && (
          <div className="mt-2 space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-2">
            <p className="flex items-start gap-2 text-xs font-medium text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Coletor parado — a listagem está na fila, mas ninguém processou.
            </p>
            <p className="text-xs text-muted-foreground">
              No Dokploy, reinicie o serviço <strong className="font-medium">collector</strong> (ou{" "}
              <strong className="font-medium">work</strong> com{" "}
              <code className="rounded bg-muted px-1">COLLECTOR_ENABLED=true</code>
              ). Precisa do mesmo <code className="rounded bg-muted px-1">DATABASE_URL</code> da
              api.
            </p>
          </div>
        )}
      </div>

      {mode === "links" ? (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              URL base da busca
            </span>
            <Input
              value={baseUrl}
              onChange={(ev) => setBaseUrl(ev.target.value)}
              className="h-8 font-mono text-[11px]"
            />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                De pág.
              </span>
              <Input
                type="number"
                min={1}
                value={rangeFrom}
                onChange={(ev) => setRangeFrom(ev.target.value)}
                className="h-8 w-20"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Até pág.
              </span>
              <Input
                type="number"
                min={1}
                value={rangeTo}
                onChange={(ev) => setRangeTo(ev.target.value)}
                className="h-8 w-20"
              />
            </label>
            <Button type="button" size="sm" onClick={armLinkQueue}>
              Armar capturador
            </Button>
          </div>
          <label className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Ou cole links (um por linha) — ignora o intervalo se houver links
            </span>
            <Textarea
              value={pastedLinks}
              onChange={(ev) => setPastedLinks(ev.target.value)}
              placeholder="https://www.shopcar.com.br/busca.php?tipo=1&tipoanuncio=2&pagina=1"
              className="min-h-[72px] font-mono text-[11px]"
            />
          </label>
          {bookmarklet && (
            <div className="space-y-2 rounded-md border border-navy/10 bg-navy/[0.03] p-2">
              <p className="text-xs text-muted-foreground">
                Arraste este link para a barra de favoritos ({urlQueue.length} páginas):
              </p>
              <a
                href={bookmarklet}
                className="inline-flex rounded-md bg-peach px-3 py-1.5 text-xs font-semibold text-navy"
                onClick={(ev) => {
                  ev.preventDefault();
                  window.alert(
                    "Arraste este botão para a barra de favoritos do Chrome (não clique). Depois abra a 1ª página no Shopcar e clique no favorito.",
                  );
                }}
              >
                ★ Capturar listagem Shopcar
              </a>
              {urlQueue[0] && (
                <p className="text-[11px] text-muted-foreground">
                  Primeira:{" "}
                  <a
                    className="underline"
                    href={urlQueue[0].url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    página {urlQueue[0].page}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmitHtml} className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Ctrl+U → Ctrl+A → Ctrl+C. Até {MAX_PAGES} páginas HTML por envio.
          </p>
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
      )}

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

"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Play, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ApiError, enqueueListingIngest, enqueueListingUrlQueue, getListingIngest } from "@/lib/api";
import type { ListingIngestItem } from "@/lib/api-types";
import { formatDateTime } from "@/lib/format";
import { getStoredToken } from "@/lib/session";
import {
  buildShopcarListingUrlRange,
  parseShopcarListingUrls,
  splitHtmlDocuments,
  validateListingHtmlChunk,
} from "@/lib/listing-ingest";

const MAX_PAGES = 10;
const STALE_MS = 90_000;
const POLL_MS = 3000;

const DEFAULT_BASE =
  "https://www.shopcar.com.br/busca.php?tipo=1&tipoanuncio=2&pagina=1";

/** Rota Next (+ rewrite .user.js) — não depende de arquivo em /public no standalone. */
const USERSCRIPT_HREF = "/capturar-shopcar.user.js";

/**
 * Captura automática: userscript (instala 1×) + um botão que percorre as páginas
 * no browser do usuário (Cloudflare). Colar HTML continua como fallback.
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
  const [showHtml, setShowHtml] = React.useState(false);
  const [html, setHtml] = React.useState("");
  const [pageFrom, setPageFrom] = React.useState("1");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [recent, setRecent] = React.useState<ListingIngestItem[]>([]);
  const [now, setNow] = React.useState(() => Date.now());
  const [scriptOk, setScriptOk] = React.useState(false);

  const [baseUrl, setBaseUrl] = React.useState(DEFAULT_BASE);
  const [rangeFrom, setRangeFrom] = React.useState("1");
  const [rangeTo, setRangeTo] = React.useState("10");
  const [pastedLinks, setPastedLinks] = React.useState("");

  const reloadRecent = React.useCallback(() => {
    return getListingIngest(source)
      .then((res) => setRecent(res.items.slice(0, 8)))
      .catch(() => {
        /* silencioso */
      });
  }, [source]);

  React.useEffect(() => {
    reloadRecent();
  }, [reloadRecent, pendingCount]);

  React.useEffect(() => {
    const check = () =>
      setScriptOk(document.documentElement.getAttribute("data-ottiv-capture") === "1");
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, []);

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

  async function startAutomaticCapture() {
    setError(null);
    setMessage(null);
    if (!scriptOk) {
      setError(
        "Instale o capturador uma vez (Tampermonkey + link abaixo). Depois este botão roda sozinho.",
      );
      return;
    }
    const token = getStoredToken();
    if (!token) {
      setError("Sessão expirada — entre de novo.");
      return;
    }
    try {
      const fromPaste = parseShopcarListingUrls(pastedLinks);
      const from = Math.max(1, Number.parseInt(rangeFrom, 10) || 1);
      const to = Math.max(from, Number.parseInt(rangeTo, 10) || from);
      const urls = pastedLinks.trim()
        ? fromPaste
        : buildShopcarListingUrlRange(baseUrl, from, to);
      if (urls.length === 0) {
        setError("Nenhum link de busca. Ajuste o intervalo ou cole URLs.");
        return;
      }
      setBusy(true);
      const queued = await enqueueListingUrlQueue(source, urls);
      localStorage.setItem(
        "ottiv-capture-arm",
        JSON.stringify({
          token,
          api: window.location.origin,
          source,
          active: true,
          armedAt: Date.now(),
        }),
      );
      document.dispatchEvent(new Event("ottiv-capture-arm"));
      await new Promise((r) => setTimeout(r, 600));
      const first = urls[0]!;
      const win = window.open(first.url, "_blank");
      if (!win) {
        setError(
          `Popup bloqueado. Permita popups para este site e tente de novo — ou abra manualmente: ${first.url}`,
        );
        return;
      }
      setMessage(
        `${queued.total} páginas — abriu a pág. ${first.page}. O capturador envia cada HTML e avança sozinho. Deixe a aba do Shopcar aberta.`,
      );
      await reloadRecent();
      await onRefresh?.();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Não iniciou.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitHtml(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const chunks = splitHtmlDocuments(html);
    if (chunks.length === 0) {
      setError("Cole o HTML completo (Ctrl+U → Ctrl+A → Ctrl+C).");
      return;
    }
    if (chunks.length > MAX_PAGES) {
      setError(`No máximo ${MAX_PAGES} páginas por envio.`);
      return;
    }
    for (let i = 0; i < chunks.length; i++) {
      const problem = validateListingHtmlChunk(chunks[i]!);
      if (problem) {
        setError(`Página ${i + 1}: ${problem}`);
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
      setMessage(`${res.queued} página(s) na fila do coletor.`);
      await reloadRecent();
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não enfileirou.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-navy/[0.06] pt-3">
      <div>
        <p className="text-xs font-medium text-navy">Ingestão assistida (listagem)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Um botão percorre as páginas no <strong className="font-medium">seu</strong> Chrome (passa na
          Cloudflare). Instale o capturador uma vez.
        </p>
      </div>

      {!scriptOk && (
        <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
          <p className="font-medium text-amber-900">1ª vez: instalar capturador</p>
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>
              Instale a extensão{" "}
              <a
                className="underline"
                href="https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo"
                target="_blank"
                rel="noreferrer"
              >
                Tampermonkey
              </a>
            </li>
            <li>
              Abra{" "}
              <a className="underline font-medium text-navy" href={USERSCRIPT_HREF} target="_blank" rel="noreferrer">
                capturar-shopcar.user.js
              </a>{" "}
              e confirme Instalar
            </li>
            <li>Recarregue esta página — o status fica “capturador pronto”</li>
          </ol>
        </div>
      )}

      {scriptOk && (
        <p className="text-xs text-emerald-700">Capturador pronto — pode usar o botão abaixo.</p>
      )}

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
      </div>
      <label className="block space-y-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Ou cole links (opcional)
        </span>
        <Textarea
          value={pastedLinks}
          onChange={(ev) => setPastedLinks(ev.target.value)}
          placeholder="https://www.shopcar.com.br/busca.php?…&pagina=1"
          className="min-h-[56px] font-mono text-[11px]"
        />
      </label>

      <Button
        type="button"
        className="w-full sm:w-auto"
        disabled={busy}
        onClick={() => void startAutomaticCapture()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Iniciar captura automática
      </Button>

      {pendingCount > 0 && !staleWaiting && (
        <p className="text-xs text-amber-700">{pendingCount} página(s) aguardando o coletor.</p>
      )}
      {staleWaiting && (
        <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-2">
          <p className="flex items-start gap-2 text-xs font-medium text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Coletor parado
          </p>
          <p className="text-xs text-muted-foreground">Reinicie o collector no Dokploy.</p>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}

      <button
        type="button"
        className="text-[11px] text-muted-foreground underline"
        onClick={() => setShowHtml((v) => !v)}
      >
        {showHtml ? "Ocultar colar HTML" : "Fallback: colar HTML (Ctrl+U)"}
      </button>

      {showHtml && (
        <form onSubmit={onSubmitHtml} className="space-y-2 border-t border-navy/[0.06] pt-2">
          <Input
            type="number"
            min={1}
            value={pageFrom}
            onChange={(ev) => setPageFrom(ev.target.value)}
            className="h-8 w-24"
            aria-label="Página inicial"
          />
          <Textarea
            value={html}
            onChange={(ev) => setHtml(ev.target.value)}
            placeholder="Cole o HTML aqui"
            className="min-h-[100px] font-mono text-[11px]"
          />
          <Button type="submit" size="sm" disabled={busy || !html.trim()}>
            <Upload className="h-3.5 w-3.5" />
            Enfileirar HTML
          </Button>
        </form>
      )}

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

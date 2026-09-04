"use client";

import * as React from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import type { AcquisitionRequestState } from "@veiculo/types";

import { ApiError, getBranches, getRequests, patchRequest, postParecer } from "@/lib/api";
import type { BranchWithLoad, RequestListItem } from "@/lib/api-types";
import { REQUEST_STATE_LABELS } from "@/lib/labels";
import { boardColumn, moveBlockReason, requestMatchesQuery } from "@/lib/tratativa";
import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { RequestsKanban } from "@/components/requests/kanban";
import { RequestsList } from "@/components/requests/requests-list";
import { RequestSheet } from "@/components/requests/request-sheet";
import { RequestsToolbar } from "@/components/requests/requests-toolbar";

type BoardView = "kanban" | "lista";
type OpenReason = "overdue" | "needs_visit" | null;

const VIEW_KEY = "veiculo-scraper:tratativa-view";

function useMobileList() {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return mobile;
}

export function RequestsBoard() {
  const { ready, operator } = useAuth();
  const [requests, setRequests] = React.useState<RequestListItem[]>([]);
  const [branches, setBranches] = React.useState<BranchWithLoad[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState<BoardView>("kanban");
  const mobile = useMobileList();
  const effectiveView: BoardView = mobile ? "lista" : view;
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [openReason, setOpenReason] = React.useState<OpenReason>(null);
  const [pendingState, setPendingState] = React.useState<AcquisitionRequestState | null>(null);
  const [movingId, setMovingId] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const [openPage, closedPage, nextBranches] = await Promise.all([
        getRequests({ limit: 100, open: true }),
        getRequests({ limit: 100, state: "closed" }),
        getBranches(),
      ]);
      const byId = new Map<number, RequestListItem>();
      for (const item of [...openPage.items, ...closedPage.items]) byId.set(item.id, item);
      setRequests([...byId.values()]);
      setBranches(nextBranches);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não carregou as tratativas.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!ready || !operator) return;
    void load();
  }, [ready, operator, load]);

  React.useEffect(() => {
    if (window.localStorage.getItem(VIEW_KEY) === "lista") setView("lista");
  }, []);

  function changeView(next: string) {
    const value: BoardView = next === "lista" ? "lista" : "kanban";
    setView(value);
    window.localStorage.setItem(VIEW_KEY, value);
  }

  const visible = requests.filter((item) =>
    requestMatchesQuery(item, query, REQUEST_STATE_LABELS[boardColumn(item.state)]),
  );
  const selected = requests.find((item) => item.id === selectedId) ?? null;
  const branchMap = new Map(branches.map((b) => [b.id, b]));

  function openCard(id: number, reason: OpenReason = null, nextState: AcquisitionRequestState | null = null) {
    setOpenReason(reason);
    setPendingState(reason === "needs_visit" ? nextState : null);
    setSelectedId(id);
  }

  async function moveTo(request: RequestListItem, state: AcquisitionRequestState) {
    if (request.state === "closed" || boardColumn(request.state) === state) return;
    const block = moveBlockReason(request.state, state, request.lockedUntil, request.proposedAt);
    if (block) {
      openCard(request.id, block, state);
      return;
    }
    setMovingId(request.id);
    setError(null);
    setRequests((atual) => atual.map((item) => (item.id === request.id ? { ...item, state } : item)));
    try {
      if (state === "closed") {
        await postParecer(request.id, { consigned: true });
      } else {
        await patchRequest(request.id, { state });
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não mudou o estágio.");
      await load();
    } finally {
      setMovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando tratativas…
      </div>
    );
  }

  if (error && requests.length === 0) {
    return (
      <div className="space-y-3 p-4 sm:p-6">
        <p className="text-sm text-destructive">{error}</p>
        <button type="button" className="text-sm font-medium text-primary" onClick={() => void load()}>
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <RequestsToolbar
        query={query}
        view={effectiveView}
        mobile={mobile}
        onQueryChange={setQuery}
        onViewChange={changeView}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma tratativa"
          description="Na fila, toque em Consignar. O carro some de lá e entra em Proposta, com 2 horas para chegar em Agendado."
        />
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum veículo bate com a busca.</p>
      ) : effectiveView === "lista" ? (
        <RequestsList requests={visible} movingId={movingId} onOpen={(id) => openCard(id)} onMove={moveTo} />
      ) : (
        <RequestsKanban requests={visible} movingId={movingId} onOpen={(id) => openCard(id)} onMove={moveTo} />
      )}

      {selected && (
        <RequestSheet
          open
          onOpenChange={(open) => {
            if (!open) {
              setSelectedId(null);
              setOpenReason(null);
              setPendingState(null);
            }
          }}
          request={selected}
          branch={branchMap.get(selected.branchId)}
          visitHint={openReason === "needs_visit"}
          pendingState={pendingState}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}

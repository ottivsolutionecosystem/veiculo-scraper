"use client";

import * as React from "react";
import type { Interaction } from "@veiculo/types";
import { Phone } from "lucide-react";

import { fetchCallRecording, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { CALL_OUTCOME_LABELS } from "@/lib/labels";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function RecordingPlayer({ interactionId }: { interactionId: number }) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const blob = await fetchCallRecording(interactionId);
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gravação indisponível.");
    } finally {
      setBusy(false);
    }
  }

  if (src) return <audio controls className="mt-1 w-full" src={src} />;
  return (
    <div className="mt-1">
      <button type="button" className="text-xs text-primary hover:underline" disabled={busy} onClick={() => void load()}>
        {busy ? "Carregando gravação…" : "Ouvir gravação"}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function CallHistory({ items }: { items: Interaction[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Phone className="h-3 w-3" /> Histórico de ligações
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-md border px-2 py-1.5 text-xs">
            <p className="font-medium">
              {item.outcome ? CALL_OUTCOME_LABELS[item.outcome] : "Em andamento"}
              <span className="ml-1 font-normal text-muted-foreground">· {formatDuration(item.durationSeconds)}</span>
            </p>
            <p className="text-muted-foreground">
              {item.author} · {formatDateTime(item.startedAt ?? item.createdAt)}
            </p>
            {item.recordingAvailable && <RecordingPlayer interactionId={item.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

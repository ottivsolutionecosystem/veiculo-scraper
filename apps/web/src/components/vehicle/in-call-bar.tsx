"use client";

import { Loader2, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CallSessionStatus } from "@/lib/use-call-session";

const STATUS_LABEL: Record<CallSessionStatus, string> = {
  idle: "",
  starting: "Preparando ligação…",
  connecting: "Conectando…",
  ringing: "Chamando…",
  active: "Em ligação",
  ended: "Encerrada",
  failed: "Falhou",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function InCallBar({
  status,
  durationSeconds,
  onHangup,
}: {
  status: CallSessionStatus;
  durationSeconds: number;
  onHangup: () => void;
}) {
  const pending = status === "starting" || status === "connecting";
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
      <p className="text-sm">
        {pending && <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />}
        {STATUS_LABEL[status]}
        {status === "active" || status === "ringing" ? ` · ${formatDuration(durationSeconds)}` : ""}
      </p>
      <Button size="sm" variant="destructive" className="min-h-11" onClick={onHangup}>
        <PhoneOff /> Encerrar
      </Button>
    </div>
  );
}

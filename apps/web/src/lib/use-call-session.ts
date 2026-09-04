"use client";

import * as React from "react";
import type { StartCallResponse, TelephonyMode } from "@veiculo/types";

import { ApiError, getTelephonySession, linkCallExternal, startVehicleCall } from "@/lib/api";
import { createSoftphoneClient, type SoftphoneClient, type SoftphoneStatus } from "@/lib/softphone";

export type CallSessionStatus = SoftphoneStatus | "starting";

export function useCallSession() {
  const [status, setStatus] = React.useState<CallSessionStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [started, setStarted] = React.useState<StartCallResponse | null>(null);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [now, setNow] = React.useState(Date.now());
  const clientRef = React.useRef<SoftphoneClient | null>(null);

  React.useEffect(() => {
    return () => {
      clientRef.current?.destroy();
    };
  }, []);

  const inCall = status === "starting" || status === "connecting" || status === "ringing" || status === "active";

  React.useEffect(() => {
    if (!inCall) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [inCall]);

  const durationSeconds = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;

  const start = React.useCallback(async (vehicleId: number) => {
    setError(null);
    setStatus("starting");
    try {
      const begun = await startVehicleCall(vehicleId);
      setStarted(begun);
      if (begun.mode === "tel_link") {
        window.location.href = `tel:${begun.phone}`;
        setStartedAt(Date.now());
        setStatus("ended");
        return begun;
      }

      const session = await getTelephonySession();
      if (!session.token) {
        window.location.href = `tel:${begun.phone}`;
        setStartedAt(Date.now());
        setStatus("ended");
        return begun;
      }

      const client = createSoftphoneClient();
      clientRef.current = client;
      client.onStatus((next) => setStatus(next));
      await client.connect(session.token);
      const { externalId } = await client.startCall(begun.phone);
      setStartedAt(Date.now());
      if (externalId) {
        await linkCallExternal(begun.interactionId, externalId).catch(() => undefined);
      }
      return begun;
    } catch (err) {
      setStatus("failed");
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Não ligou.");
      throw err;
    }
  }, []);

  const hangup = React.useCallback(async () => {
    await clientRef.current?.hangup();
    setStatus("ended");
  }, []);

  const reset = React.useCallback(() => {
    clientRef.current?.destroy();
    clientRef.current = null;
    setStatus("idle");
    setError(null);
    setStarted(null);
    setStartedAt(null);
  }, []);

  return {
    status,
    error,
    started,
    durationSeconds,
    inCall,
    mode: (started?.mode ?? null) as TelephonyMode | null,
    start,
    hangup,
    reset,
  };
}

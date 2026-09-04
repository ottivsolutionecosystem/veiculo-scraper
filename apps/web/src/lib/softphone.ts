import type { CallActive, CallOutgoing, Wavoip } from "@wavoip/wavoip-api";

import { phoneDigitsForWhatsapp } from "@/lib/contato";

export type SoftphoneStatus = "idle" | "connecting" | "ringing" | "active" | "ended" | "failed";

export interface SoftphoneClient {
  connect(token: string): Promise<void>;
  startCall(to: string): Promise<{ externalId?: string }>;
  hangup(): Promise<void>;
  onStatus(cb: (status: SoftphoneStatus) => void): () => void;
  destroy(): void;
}

/** Encapsula o SDK de voz. A UI só fala com este cliente. */
export function createSoftphoneClient(): SoftphoneClient {
  let instance: Wavoip | null = null;
  let outgoing: CallOutgoing | null = null;
  let active: CallActive | null = null;
  const listeners = new Set<(status: SoftphoneStatus) => void>();
  const emit = (status: SoftphoneStatus) => {
    listeners.forEach((listener) => listener(status));
  };

  return {
    async connect(token: string) {
      const { Wavoip } = await import("@wavoip/wavoip-api");
      instance = new Wavoip({ tokens: [token], platform: "web" });
    },

    async startCall(to: string) {
      if (!instance) throw new Error("Softphone desconectado.");
      emit("connecting");
      const result = await instance.startCall({ to: phoneDigitsForWhatsapp(to) });
      if (result.err || !result.call) {
        emit("failed");
        throw new Error(result.err?.message || "Não foi possível iniciar a ligação.");
      }
      outgoing = result.call;
      emit("ringing");
      result.call.onPeerAccept((next) => {
        active = next;
        emit("active");
        next.onEnd(() => emit("ended"));
      });
      result.call.onPeerReject(() => emit("ended"));
      result.call.onUnanswered(() => emit("ended"));
      result.call.onEnd(() => emit("ended"));
      return { externalId: result.call.id };
    },

    async hangup() {
      try {
        if (active) await active.end();
        else if (outgoing) await outgoing.cancel();
      } finally {
        emit("ended");
      }
    },

    onStatus(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },

    destroy() {
      listeners.clear();
      outgoing = null;
      active = null;
      instance = null;
    },
  };
}

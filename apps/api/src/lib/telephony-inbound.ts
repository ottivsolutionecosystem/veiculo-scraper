/** Eventos inbound do fornecedor de voz. Aceita os shapes documentados
 * (call.created / call.updated / record.updated) sem assumir um único envelope. */

export type InboundCallStatus = "created" | "ringing" | "ended";

export type InboundTelephonyEvent =
  | {
      kind: "call";
      externalId: string;
      status: InboundCallStatus;
      durationSeconds: number | null;
    }
  | {
      kind: "record";
      externalId: string;
      recordUrl: string | null;
      ready: boolean;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const found = text(value);
    if (found) return found;
  }
  return null;
}

function durationSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  return null;
}

function eventName(payload: Record<string, unknown>): string {
  return (firstText(payload.event, payload.type, payload.evento) ?? "").toLowerCase();
}

function unwrapData(payload: Record<string, unknown>): Record<string, unknown> {
  return asRecord(payload.data) ?? asRecord(payload.payload) ?? payload;
}

function callStatus(raw: unknown): InboundCallStatus | null {
  const value = text(raw)?.toUpperCase();
  if (!value) return null;
  if (value === "ENDED" || value === "COMPLETED" || value === "FINISHED" || value === "HANGUP") {
    return "ended";
  }
  if (value === "RINGING" || value === "OFFER" || value === "CALLING") return "ringing";
  if (value === "CREATED" || value === "QUEUED" || value === "INITIATED") return "created";
  return null;
}

function isRecordEvent(name: string): boolean {
  return name.includes("record");
}

function isCallEvent(name: string): boolean {
  return name.includes("call");
}

function isReady(raw: unknown): boolean {
  const value = text(raw)?.toUpperCase();
  return value === "READY" || value === "AVAILABLE" || value === "COMPLETED";
}

export function parseInboundTelephony(payload: unknown): InboundTelephonyEvent | null {
  const root = asRecord(payload);
  if (!root) return null;
  const data = unwrapData(root);
  const name = eventName(root) || eventName(data);
  const externalId = firstText(
    data.whatsapp_call_id,
    data.whatsappCallId,
    data.call_id,
    data.callId,
    data.id_externo,
    data.id,
  );
  if (!externalId) return null;

  if (isRecordEvent(name) || data.record_url || data.recordUrl) {
    const recordUrl = firstText(data.record_url, data.recordUrl, data.url);
    return {
      kind: "record",
      externalId,
      recordUrl,
      ready: isReady(data.status) || Boolean(recordUrl),
    };
  }

  if (isCallEvent(name) || data.status) {
    const status =
      name.endsWith(".created") || name.endsWith(":created")
        ? "created"
        : callStatus(data.status) ?? (name.includes("end") ? "ended" : null);
    if (!status) return null;
    return {
      kind: "call",
      externalId,
      status,
      durationSeconds: durationSeconds(data.duration ?? data.duration_seconds ?? data.durationSeconds),
    };
  }

  return null;
}

export function deliveryIdFromHeaders(headers: Record<string, unknown>): string | null {
  const raw = headers["x-wavoip-delivery-id"] ?? headers["X-Wavoip-Delivery-Id"];
  if (Array.isArray(raw)) return firstText(raw[0]);
  return firstText(raw);
}

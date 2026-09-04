import { describe, expect, it } from "vitest";

import { deliveryIdFromHeaders, parseInboundTelephony } from "./telephony-inbound.js";

describe("parseInboundTelephony", () => {
  it("lê call.updated ENDED com duração", () => {
    expect(
      parseInboundTelephony({
        event: "call.updated",
        data: { whatsapp_call_id: "wa-1", status: "ENDED", duration: 42 },
      }),
    ).toEqual({
      kind: "call",
      externalId: "wa-1",
      status: "ended",
      durationSeconds: 42,
    });
  });

  it("lê call.created", () => {
    expect(
      parseInboundTelephony({
        type: "call.created",
        payload: { whatsappCallId: "wa-2", status: "RINGING" },
      }),
    ).toEqual({
      kind: "call",
      externalId: "wa-2",
      status: "created",
      durationSeconds: null,
    });
  });

  it("lê record.updated READY", () => {
    expect(
      parseInboundTelephony({
        event: "record.updated",
        data: {
          whatsapp_call_id: "wa-3",
          status: "READY",
          record_url: "https://storage.example/wa-3",
        },
      }),
    ).toEqual({
      kind: "record",
      externalId: "wa-3",
      recordUrl: "https://storage.example/wa-3",
      ready: true,
    });
  });

  it("ignora envelope sem id", () => {
    expect(parseInboundTelephony({ event: "call.updated", data: { status: "ENDED" } })).toBeNull();
  });
});

describe("deliveryIdFromHeaders", () => {
  it("lê o header de idempotência", () => {
    expect(deliveryIdFromHeaders({ "x-wavoip-delivery-id": "d-9" })).toBe("d-9");
  });
});

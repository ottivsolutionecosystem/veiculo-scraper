import { describe, expect, it } from "vitest";

import { readSession, signSession } from "./session.js";

describe("session", () => {
  const secret = "teste-secreto";

  it("assina e lê o id do consignador", () => {
    const token = signSession(7, secret, Date.parse("2026-08-18T12:00:00Z"));
    expect(readSession(token, secret, Date.parse("2026-08-18T12:00:00Z"))).toBe(7);
  });

  it("rejeita assinatura ou prazo vencido", () => {
    const token = signSession(7, secret, Date.parse("2026-08-01T12:00:00Z"));
    expect(readSession(`${token}x`, secret)).toBeNull();
    expect(readSession(token, "outro")).toBeNull();
    expect(readSession(token, secret, Date.parse("2026-09-20T12:00:00Z"))).toBeNull();
  });
});

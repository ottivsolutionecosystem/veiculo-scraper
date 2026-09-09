import { describe, expect, it } from "vitest";

import { normalizePhoneBR, phoneHash, manualContactExpiry, MANUAL_CONTACT_TTL_DAYS } from "./telefone.js";

describe("normalizePhoneBR", () => {
  it("aceita celular com máscara", () => {
    expect(normalizePhoneBR("(11) 99999-8888")).toBe("+5511999998888");
    expect(normalizePhoneBR("11999998888")).toBe("+5511999998888");
  });

  it("aceita fixo de 10 dígitos", () => {
    expect(normalizePhoneBR("(11) 3333-4444")).toBe("+551133334444");
  });

  it("tira o +55 e o 0 de operadora", () => {
    expect(normalizePhoneBR("+55 11 99999-8888")).toBe("+5511999998888");
    expect(normalizePhoneBR("055 11 99999-8888")).toBe("+5511999998888");
  });

  it("recusa número curto ou comprido demais", () => {
    expect(normalizePhoneBR("99998888")).toBeNull();
    expect(normalizePhoneBR("119999988887777")).toBeNull();
    expect(normalizePhoneBR("")).toBeNull();
  });

  it("recusa celular de 11 dígitos sem o nono 9", () => {
    expect(normalizePhoneBR("11899998888")).toBeNull();
  });

  it("recusa DDD inexistente", () => {
    expect(normalizePhoneBR("0199999888")).toBeNull();
    expect(normalizePhoneBR("(01) 99999-8888")).toBeNull();
  });
});

describe("phoneHash", () => {
  it("é estável e não devolve o número", () => {
    const hash = phoneHash("+5511999998888");
    expect(hash).toBe(phoneHash("+5511999998888"));
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("999998888");
  });

  it("telefones diferentes dão hashes diferentes", () => {
    expect(phoneHash("+5511999998888")).not.toBe(phoneHash("+5511999998889"));
  });
});

describe("manualContactExpiry", () => {
  it("vence no prazo do TTL", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const dias = (manualContactExpiry(now).getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    expect(dias).toBe(MANUAL_CONTACT_TTL_DAYS);
  });
});

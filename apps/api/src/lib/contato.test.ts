import { describe, expect, it } from "vitest";

import { CONTACT_BLOCK_MESSAGE, contactBlockReason, phoneDigitsForWhatsapp } from "./contato.js";

describe("canais de saída", () => {
  it("mutado bloqueia antes de não perturbe", () => {
    expect(contactBlockReason({ muted: true, doNotDisturb: true, hasPhone: true })).toBe("muted");
    expect(CONTACT_BLOCK_MESSAGE.muted).toMatch(/mutado/i);
  });

  it("não perturbe bloqueia ligar e WhatsApp", () => {
    expect(contactBlockReason({ muted: false, doNotDisturb: true, hasPhone: true })).toBe("do_not_disturb");
  });

  it("sem telefone não revela", () => {
    expect(contactBlockReason({ muted: false, doNotDisturb: false, hasPhone: false })).toBe("no_phone");
  });

  it("livre quando tem telefone e não está bloqueado", () => {
    expect(contactBlockReason({ muted: false, doNotDisturb: false, hasPhone: true })).toBeNull();
  });
});

describe("WhatsApp", () => {
  it("mantém E.164 e prefixa 55 em número nacional", () => {
    expect(phoneDigitsForWhatsapp("+55 67 99999-1234")).toBe("5567999991234");
    expect(phoneDigitsForWhatsapp("(67) 99999-1234")).toBe("5567999991234");
  });
});

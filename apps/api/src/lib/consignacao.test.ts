import { describe, expect, it } from "vitest";

import {
  canClaim,
  canTransfer,
  canWork,
  effectOfOutcome,
  effectOfParecer,
  followUpAt,
  isTratativaOverdue,
  lockUntil,
  needsVisitAt,
  normalizeOutcome,
  tratativaDeadline,
} from "./consignacao.js";

describe("effectOfOutcome", () => {
  it("aceitou consignar vai para o estoque", () => {
    expect(effectOfOutcome("accepted_consign")).toEqual({
      state: "acquired",
      discardReason: null,
      followUpDays: null,
    });
    expect(effectOfOutcome("agreed_to_bring").state).toBe("acquired");
  });

  it("não atendeu fica na fila com follow-up de 1 dia", () => {
    const effect = effectOfOutcome("no_answer");
    expect(effect.state).toBe("contacted");
    expect(effect.followUpDays).toBe(1);
    expect(effect.discardReason).toBeNull();
  });

  it("não consignou volta à fila com a tag, sem descartar", () => {
    expect(effectOfOutcome("not_interested")).toEqual({
      state: "contacted",
      discardReason: "Sem interesse em consignar",
      followUpDays: null,
    });
    expect(effectOfOutcome("wants_cash").discardReason).toBe("Quer vender à vista");
    expect(effectOfOutcome("unrealistic_price").discardReason).toBe("Preço irreal");
  });
});

describe("effectOfParecer", () => {
  it("consignou fecha a tratativa e vai ao estoque, sem soltar o dono", () => {
    expect(effectOfParecer(true)).toEqual({
      requestState: "closed",
      vehicleState: "acquired",
      discardReason: null,
      clearOwner: false,
    });
  });

  it("não consignou devolve à fila com o motivo", () => {
    expect(effectOfParecer(false, "Preço irreal")).toEqual({
      requestState: "declined",
      vehicleState: "contacted",
      discardReason: "Preço irreal",
      clearOwner: true,
    });
  });

  it("não consignou sem motivo não fecha", () => {
    expect(() => effectOfParecer(false, "  ")).toThrow(/motivo/);
  });
});

describe("canClaim", () => {
  const agora = new Date("2026-08-18T12:00:00Z");

  it("livre ou trava vencida sem tratativa qualquer consignador pega", () => {
    expect(canClaim(agora, { operatorId: null, lockedUntil: null, lastContactedAt: null }, 1)).toBe(true);
    expect(
      canClaim(
        agora,
        { operatorId: 2, lockedUntil: new Date("2026-08-18T11:00:00Z"), lastContactedAt: null },
        1,
      ),
    ).toBe(true);
  });

  it("trava vigente só o dono renova", () => {
    const lock = {
      operatorId: 1,
      lockedUntil: new Date("2026-08-18T14:00:00Z"),
      lastContactedAt: null,
    };
    expect(canClaim(agora, lock, 1)).toBe(true);
    expect(canClaim(agora, lock, 2)).toBe(false);
  });

  it("contato antigo sem tratativa não prende o carro — volta à fila livre", () => {
    const lock = {
      operatorId: 1,
      lockedUntil: new Date("2026-08-18T11:00:00Z"),
      lastContactedAt: new Date("2026-08-18T10:00:00Z"),
    };
    expect(canClaim(agora, lock, 2)).toBe(true);
  });

  it("tratativa aberta fica com o dono mesmo com a trava vencida", () => {
    const lock = {
      operatorId: 1,
      lockedUntil: new Date("2026-08-18T11:00:00Z"),
      lastContactedAt: new Date("2026-08-18T10:00:00Z"),
      openDeal: true,
    };
    expect(canClaim(agora, lock, 1)).toBe(true);
    expect(canClaim(agora, lock, 2)).toBe(false);
  });

  it("sem identidade não trava — a operação precisa saber quem assumiu", () => {
    expect(canClaim(agora, { operatorId: null, lockedUntil: null, lastContactedAt: null }, 0)).toBe(false);
  });
});

describe("prazos da tratativa", () => {
  const agora = new Date("2026-08-18T12:00:00Z");
  const duasHoras = new Date("2026-08-18T14:00:00Z");
  const visita = new Date("2026-08-19T15:00:00Z");

  it("até Agendado o prazo é a trava de 2h", () => {
    expect(tratativaDeadline("requested", duasHoras, null)?.toISOString()).toBe(duasHoras.toISOString());
    expect(isTratativaOverdue(agora, "accepted", duasHoras, null)).toBe(false);
    expect(isTratativaOverdue(duasHoras, "requested", duasHoras, null)).toBe(true);
  });

  it("em Agendado o prazo passa a ser a visita", () => {
    expect(tratativaDeadline("scheduled", duasHoras, visita)?.toISOString()).toBe(visita.toISOString());
    expect(isTratativaOverdue(agora, "scheduled", duasHoras, visita)).toBe(false);
  });

  it("só Agendado exige data da visita", () => {
    expect(needsVisitAt("scheduled", null)).toBe(true);
    expect(needsVisitAt("closed", null)).toBe(false);
    expect(needsVisitAt("scheduled", visita)).toBe(false);
    expect(needsVisitAt("accepted", null)).toBe(false);
  });
});

describe("canTransfer", () => {
  it("só o dono passa para outra pessoa", () => {
    expect(canTransfer(1, 1, 2)).toBe(true);
    expect(canTransfer(1, 2, 3)).toBe(false);
    expect(canTransfer(null, 1, 2)).toBe(false);
    expect(canTransfer(1, 1, 1)).toBe(false);
  });

  it("master reatribui o carro de qualquer um", () => {
    expect(canTransfer(1, 99, 2, true)).toBe(true);
    expect(canTransfer(1, 99, 1, true)).toBe(false);
    expect(canTransfer(null, 99, 2, true)).toBe(false);
  });
});

describe("canWork", () => {
  const agora = new Date("2026-08-18T12:00:00Z");
  const deOutro = {
    operatorId: 1,
    lockedUntil: new Date("2026-08-18T14:00:00Z"),
    lastContactedAt: new Date("2026-08-18T13:00:00Z"),
  };

  it("consignador não mexe no carro de outro", () => {
    expect(canWork(agora, deOutro, 2)).toBe(false);
    expect(canWork(agora, deOutro, 1)).toBe(true);
  });

  it("master age em qualquer carro", () => {
    expect(canWork(agora, deOutro, 99, true)).toBe(true);
  });
});

describe("helpers", () => {
  it("normalizeOutcome mapeia o resultado antigo", () => {
    expect(normalizeOutcome("agreed_to_bring")).toBe("accepted_consign");
    expect(normalizeOutcome("no_answer")).toBe("no_answer");
  });

  it("lockUntil e followUpAt avançam o relógio em horas/dias", () => {
    const agora = new Date("2026-08-18T12:00:00Z");
    expect(lockUntil(agora, 2).toISOString()).toBe("2026-08-18T14:00:00.000Z");
    expect(followUpAt(agora, 2).toISOString()).toBe("2026-08-20T12:00:00.000Z");
  });
});

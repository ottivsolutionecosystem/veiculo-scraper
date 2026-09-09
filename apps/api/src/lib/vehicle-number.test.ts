import { describe, expect, it } from "vitest";

import { parseVehicleNumberQuery } from "./vehicle-number.js";

describe("parseVehicleNumberQuery", () => {
  it("sem busca não filtra nada", () => {
    expect(parseVehicleNumberQuery(undefined)).toEqual({ id: null, text: null });
    expect(parseVehicleNumberQuery("   ")).toEqual({ id: null, text: null });
  });

  it("com # busca só pelo número", () => {
    expect(parseVehicleNumberQuery("#42")).toEqual({ id: 42, text: null });
    expect(parseVehicleNumberQuery("  #42  ")).toEqual({ id: 42, text: null });
  });

  it("número solto vale como id e como texto", () => {
    expect(parseVehicleNumberQuery("2018")).toEqual({ id: 2018, text: "2018" });
  });

  it("texto comum não vira id", () => {
    expect(parseVehicleNumberQuery("onix")).toEqual({ id: null, text: "onix" });
    expect(parseVehicleNumberQuery("onix 2018")).toEqual({ id: null, text: "onix 2018" });
  });

  it("# com algo que não é número cai no texto", () => {
    expect(parseVehicleNumberQuery("#onix")).toEqual({ id: null, text: "#onix" });
    expect(parseVehicleNumberQuery("#")).toEqual({ id: null, text: "#" });
  });

  it("id inválido não vira filtro", () => {
    expect(parseVehicleNumberQuery("#0")).toEqual({ id: null, text: "#0" });
    expect(parseVehicleNumberQuery("#-1")).toEqual({ id: null, text: "#-1" });
    expect(parseVehicleNumberQuery("#1.5")).toEqual({ id: null, text: "#1.5" });
    expect(parseVehicleNumberQuery("#99999999999999999999")).toEqual({
      id: null,
      text: "#99999999999999999999",
    });
  });
});

import { describe, expect, it } from "vitest";

import { isMaster, isMasterLogin, MASTER_LOGIN } from "./roles.js";

describe("roles", () => {
  it("só guilherme.sanches é o master pelo login", () => {
    expect(MASTER_LOGIN).toBe("guilherme.sanches");
    expect(isMasterLogin("Guilherme.Sanches")).toBe(true);
    expect(isMasterLogin("ana")).toBe(false);
  });

  it("papel master manda mesmo se o login mudar no objeto", () => {
    expect(isMaster({ login: "ana", role: "master" })).toBe(true);
    expect(isMaster({ login: "ana", role: "consignador" })).toBe(false);
  });
});

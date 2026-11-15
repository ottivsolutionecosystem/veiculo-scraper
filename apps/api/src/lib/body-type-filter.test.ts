import { describe, expect, it } from "vitest";

import { BODY_TYPES, bodyTypeClause } from "./body-type-filter.js";

describe("bodyTypeClause", () => {
  it("gera OR por token e empurra params", () => {
    const values: unknown[] = [];
    const sql = bodyTypeClause("picape", values);
    expect(sql.startsWith("AND (")).toBe(true);
    expect(sql).toContain("f.titulo_normalizado ILIKE $1");
    expect(sql).toContain("f.modelo ILIKE $1");
    expect(values.length).toBeGreaterThanOrEqual(2);
    expect(values.every((v) => typeof v === "string" && String(v).includes("%"))).toBe(true);
  });

  it("cobre todas as famílias", () => {
    for (const type of BODY_TYPES) {
      const values: unknown[] = [];
      expect(bodyTypeClause(type, values)).toMatch(/^AND \(/);
      expect(values.length).toBeGreaterThan(0);
    }
  });
});

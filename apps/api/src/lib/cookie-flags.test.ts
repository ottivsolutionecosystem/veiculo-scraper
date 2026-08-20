import { describe, expect, it } from "vitest";

import { sessionCookieFlags } from "./cookie-flags.js";

describe("cookie de sessão", () => {
  it("em HTTP local não leva Secure", () => {
    expect(sessionCookieFlags("http://localhost:3000")).not.toMatch(/Secure/);
    expect(sessionCookieFlags("http://localhost:3000")).toMatch(/HttpOnly/);
  });

  it("em HTTPS de produção leva Secure", () => {
    expect(sessionCookieFlags("https://app.exemplo.com.br")).toMatch(/;\s*Secure$/);
  });
});

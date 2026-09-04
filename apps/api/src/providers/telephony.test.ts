import { describe, expect, it } from "vitest";

import { createTelephonyProvider } from "./telephony.js";
import { WavoipTelephonyProvider } from "./wavoip-telephony.js";

describe("createTelephonyProvider", () => {
  it("cai no tel: sem token", () => {
    expect(createTelephonyProvider("").capabilities().mode).toBe("tel_link");
  });

  it("liga softphone quando há token", () => {
    const provider = createTelephonyProvider("device-token");
    expect(provider.capabilities().mode).toBe("softphone");
    expect(provider.sessionToken()).toBe("device-token");
  });
});

describe("WavoipTelephonyProvider", () => {
  it("monta URL de gravação sem expor o token", () => {
    const provider = new WavoipTelephonyProvider("secret");
    expect(provider.recordingUrl("abc/def")).toBe("https://storage.wavoip.com/abc%2Fdef");
  });
});

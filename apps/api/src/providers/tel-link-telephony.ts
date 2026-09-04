import type { TelephonyProvider } from "./telephony.js";

/** Sem token de voz: a UI cai no `tel:` nativo. */
export class TelLinkTelephonyProvider implements TelephonyProvider {
  capabilities() {
    return { mode: "tel_link" as const };
  }

  sessionToken(): string | null {
    return null;
  }

  recordingUrl(): string | null {
    return null;
  }
}

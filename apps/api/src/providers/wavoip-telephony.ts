import type { TelephonyProvider } from "./telephony.js";

/** Adapter do fornecedor de voz no WhatsApp. A UI nunca importa isto. */
export class WavoipTelephonyProvider implements TelephonyProvider {
  constructor(private readonly token: string) {}

  capabilities() {
    return { mode: "softphone" as const };
  }

  sessionToken(): string | null {
    return this.token;
  }

  recordingUrl(externalId: string): string | null {
    const id = externalId.trim();
    if (!id) return null;
    return `https://storage.wavoip.com/${encodeURIComponent(id)}`;
  }
}

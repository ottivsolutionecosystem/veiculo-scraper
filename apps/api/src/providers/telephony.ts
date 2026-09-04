import { env } from "../env.js";
import { TelLinkTelephonyProvider } from "./tel-link-telephony.js";
import { WavoipTelephonyProvider } from "./wavoip-telephony.js";

export type TelephonyMode = "softphone" | "tel_link";

export interface TelephonyCapabilities {
  mode: TelephonyMode;
}

export interface TelephonyProvider {
  capabilities(): TelephonyCapabilities;
  /** Token do dispositivo para o softphone autenticado. Nunca logar. */
  sessionToken(): string | null;
  recordingUrl(externalId: string): string | null;
}

export function createTelephonyProvider(token = env.wavoipDeviceToken): TelephonyProvider {
  if (token) return new WavoipTelephonyProvider(token);
  return new TelLinkTelephonyProvider();
}

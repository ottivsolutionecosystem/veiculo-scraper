import { ImageResponse } from "next/og";

import { AuttusPwaGlyph } from "@/lib/pwa-icon";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(<AuttusPwaGlyph size={192} />, { width: 192, height: 192 });
}

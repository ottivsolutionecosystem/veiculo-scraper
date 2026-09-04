import { ImageResponse } from "next/og";

import { AuttusPwaGlyph } from "@/lib/pwa-icon";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(<AuttusPwaGlyph size={512} />, { width: 512, height: 512 });
}

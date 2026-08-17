"use client";

import * as React from "react";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function SellerToggles({ muted, doNotDisturb }: { muted: boolean; doNotDisturb: boolean }) {
  const [isMuted, setIsMuted] = React.useState(muted);
  const [isDnd, setIsDnd] = React.useState(doNotDisturb);

  return (
    <div className="flex flex-wrap gap-6">
      <div className="flex items-center gap-2">
        <Switch id="muted" checked={isMuted} onCheckedChange={setIsMuted} />
        <Label htmlFor="muted">Vendedor mutado (silencia todos os anúncios dele)</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="dnd" checked={isDnd} onCheckedChange={setIsDnd} />
        <Label htmlFor="dnd">Não perturbe</Label>
      </div>
    </div>
  );
}

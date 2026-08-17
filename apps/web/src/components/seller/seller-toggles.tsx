"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { patchSeller } from "@/lib/api";

export function SellerToggles({
  sellerId,
  muted,
  doNotDisturb,
}: {
  sellerId: number;
  muted: boolean;
  doNotDisturb: boolean;
}) {
  const [isMuted, setIsMuted] = React.useState(muted);
  const [isDnd, setIsDnd] = React.useState(doNotDisturb);
  const [saving, setSaving] = React.useState(false);

  async function toggleMuted(value: boolean) {
    setIsMuted(value);
    setSaving(true);
    try {
      await patchSeller(sellerId, { muted: value });
    } finally {
      setSaving(false);
    }
  }

  async function toggleDnd(value: boolean) {
    setIsDnd(value);
    setSaving(true);
    try {
      await patchSeller(sellerId, { doNotDisturb: value });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2">
        <Switch id="muted" checked={isMuted} disabled={saving} onCheckedChange={toggleMuted} />
        <Label htmlFor="muted">Vendedor mutado (silencia todos os anúncios dele)</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="dnd" checked={isDnd} disabled={saving} onCheckedChange={toggleDnd} />
        <Label htmlFor="dnd">Não perturbe</Label>
      </div>
      {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

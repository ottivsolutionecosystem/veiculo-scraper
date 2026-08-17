"use client";

import * as React from "react";

import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { patchSource } from "@/lib/api";

export function SourceToggle({
  source,
  active,
  locked,
  lockedReason,
}: {
  source: string;
  active: boolean;
  locked: boolean;
  lockedReason?: string;
}) {
  const [checked, setChecked] = React.useState(active);
  const [saving, setSaving] = React.useState(false);

  async function onCheckedChange(value: boolean) {
    setChecked(value);
    setSaving(true);
    try {
      await patchSource(source, value);
    } catch {
      setChecked(!value);
    } finally {
      setSaving(false);
    }
  }

  const toggle = <Switch checked={checked} disabled={locked || saving} onCheckedChange={onCheckedChange} />;

  if (!locked) return toggle;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{toggle}</span>
        </TooltipTrigger>
        <TooltipContent>{lockedReason ?? `${source} não pode ser ligada por aqui.`}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

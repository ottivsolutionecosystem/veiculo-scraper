"use client";

import * as React from "react";

import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

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

  const toggle = <Switch checked={checked} disabled={locked} onCheckedChange={setChecked} />;

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

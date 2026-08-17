"use client";

import * as React from "react";
import type { Settings } from "@veiculo/types";
import { X } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function RulesTab({ settings }: { settings: Settings }) {
  const [reasons, setReasons] = React.useState(settings.discardReasons);
  const [newReason, setNewReason] = React.useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Motivos de descarte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((reason) => (
              <Badge key={reason} variant="outline" className="gap-1">
                {reason}
                <button onClick={() => setReasons((r) => r.filter((x) => x !== reason))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Novo motivo"
            />
            <Button
              variant="outline"
              onClick={() => {
                if (!newReason.trim()) return;
                setReasons((r) => [...r, newReason.trim()]);
                setNewReason("");
              }}
            >
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gatilho de retorno e cadência</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Queda de preço (%)</Label>
            <Input type="number" defaultValue={settings.returnTriggerPricePct} />
          </div>
          <div className="space-y-1">
            <Label>Dias parados</Label>
            <Input type="number" defaultValue={settings.returnTriggerDays} />
          </div>
          <div className="space-y-1">
            <Label>Cooldown por vendedor (h)</Label>
            <Input type="number" defaultValue={settings.sellerCooldownHours} />
          </div>
          <div className="space-y-1">
            <Label>Follow-up (dias, separados por vírgula)</Label>
            <Input defaultValue={settings.followUpDays.join(", ")} />
          </div>
          <div className="space-y-1">
            <Label>Horário permitido — início</Label>
            <Input type="time" defaultValue={settings.allowedHoursStart} />
          </div>
          <div className="space-y-1">
            <Label>Horário permitido — fim</Label>
            <Input type="time" defaultValue={settings.allowedHoursEnd} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

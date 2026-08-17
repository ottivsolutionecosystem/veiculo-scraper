import type { Settings } from "@veiculo/types";

import { Slider } from "@/components/ui/slider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function WeightsTab({
  draft,
  onChange,
}: {
  draft: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const total = draft.weights.reduce((sum, w) => sum + w.weight, 0);

  function setWeight(idx: number, weight: number) {
    onChange({ weights: draft.weights.map((w, i) => (i === idx ? { ...w, weight } : w)) });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Pesos do score de oportunidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {draft.weights.map((w, idx) => (
            <div key={w.key} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>{w.label}</span>
                <span className="font-medium">{(w.weight * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[w.weight * 100]}
                max={40}
                step={1}
                onValueChange={([v]) => setWeight(idx, (v ?? 0) / 100)}
              />
            </div>
          ))}
          <p className={`text-xs ${Math.abs(total - 1) > 0.02 ? "text-destructive" : "text-muted-foreground"}`}>
            Soma atual: {(total * 100).toFixed(0)}% (ideal: 100%)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faixas de classificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Quente</span>
            <span className="text-muted-foreground">≥ {draft.bandThresholds.hot}</span>
          </div>
          <Progress value={draft.bandThresholds.hot} />
          <div className="flex items-center justify-between">
            <span>Boa</span>
            <span className="text-muted-foreground">≥ {draft.bandThresholds.good}</span>
          </div>
          <Progress value={draft.bandThresholds.good} />
          <div className="flex items-center justify-between">
            <span>Morna</span>
            <span className="text-muted-foreground">≥ {draft.bandThresholds.warm}</span>
          </div>
          <Progress value={draft.bandThresholds.warm} />
        </CardContent>
      </Card>
    </div>
  );
}

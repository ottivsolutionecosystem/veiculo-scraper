import type { Score } from "@veiculo/types";
import { Gauge } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreBadge } from "@/components/shared/score-badge";
import { SCORE_COMPONENT_LABELS } from "@/lib/labels";

export function ScoreBreakdown({ score }: { score: Score | null }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-4 w-4" /> Score de oportunidade
        </CardTitle>
        <ScoreBadge score={score} />
      </CardHeader>
      <CardContent className="space-y-3">
        {!score ? (
          <p className="text-sm text-muted-foreground">Score ainda não calculado.</p>
        ) : (
          score.components.map((c) => (
            <div key={c.key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{SCORE_COMPONENT_LABELS[c.key]}</span>
                <span className="text-muted-foreground">
                  {c.rawValueLabel} → {c.points >= 0 ? "+" : ""}
                  {c.points} pts
                </span>
              </div>
              <Progress value={Math.max(0, Math.min(100, ((c.points + 20) / 50) * 100))} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

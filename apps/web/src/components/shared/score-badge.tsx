import type { Score } from "@veiculo/types";

import { Badge } from "@/components/ui/badge";
import { SCORE_BAND_LABELS } from "@/lib/labels";

export function ScoreBadge({ score }: { score: Score | null }) {
  if (!score) return <Badge variant="outline">Sem score</Badge>;
  return (
    <Badge variant={score.band}>
      {score.total} · {SCORE_BAND_LABELS[score.band]}
    </Badge>
  );
}

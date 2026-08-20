import { Suspense } from "react";

import { QueueBoard } from "@/components/queue/queue-board";

export default function FilaDoDiaPage() {
  return (
    <Suspense>
      <QueueBoard />
    </Suspense>
  );
}

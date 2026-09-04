import { Suspense } from "react";

import { QueueBoard } from "@/components/queue/queue-board";

export default function FilaDoDiaPage() {
  return (
    <Suspense>
      <div className="h-full min-h-0">
        <QueueBoard />
      </div>
    </Suspense>
  );
}

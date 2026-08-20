import { Suspense } from "react";

import { OpsBoard } from "@/components/ops/ops-board";

export default function OperacaoPage() {
  return (
    <Suspense>
      <OpsBoard />
    </Suspense>
  );
}

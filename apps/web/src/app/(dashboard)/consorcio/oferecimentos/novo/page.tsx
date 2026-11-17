"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createOffer } from "@/lib/consorcio/store";

export default function NovoOferecimentoPage() {
  const router = useRouter();

  React.useEffect(() => {
    const offer = createOffer();
    router.replace(`/consorcio/oferecimentos/${offer.id}`);
  }, [router]);

  return <p className="p-6 text-sm text-muted-foreground">Criando oferecimento…</p>;
}

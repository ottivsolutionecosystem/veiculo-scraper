"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api";
import { createConsorcioOffer } from "@/lib/consorcio/api";

export default function NovoOferecimentoPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void createConsorcioOffer()
      .then((offer) => {
        if (!cancelled) router.replace(`/consorcio/oferecimentos/${offer.id}`);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Não criou o oferecimento.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;
  return <p className="p-6 text-sm text-muted-foreground">Criando oferecimento…</p>;
}

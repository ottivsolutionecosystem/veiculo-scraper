"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Volta para a lista de onde o consignador veio (histórico) ou para a fila. */
export function BackToList({ className }: { className?: string }) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={goBack}
      className={cn("-ml-2 text-navy hover:bg-navy/5", className)}
    >
      <ArrowLeft />
      Voltar
    </Button>
  );
}

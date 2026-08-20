import Link from "next/link";

import { AuttusMark } from "@/components/brand/auttus-mark";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <AuttusMark className="h-10 w-10" />
      <h2 className="text-lg font-semibold text-navy">Não encontrado</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        O item que você procura não existe ou foi removido.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Voltar para a fila de trabalho</Link>
      </Button>
    </div>
  );
}

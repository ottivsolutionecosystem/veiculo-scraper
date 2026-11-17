"use client";

import * as React from "react";
import { Camera } from "lucide-react";

import type { ConsorcioOffer } from "@veiculo/types";
import { PhotoSlots } from "@/components/consorcio/photo-slots";
import { AuttusWordmark } from "@/components/brand/auttus-mark";
import { formatPlate } from "@/lib/consorcio/plate";
import { getOfferByToken } from "@/lib/consorcio/store";

export function PublicUpload({ token }: { token: string }) {
  const [offer, setOffer] = React.useState<ConsorcioOffer | null | undefined>(undefined);

  React.useEffect(() => {
    setOffer(getOfferByToken(token));
  }, [token]);

  if (offer === undefined) {
    return <p className="p-6 text-sm text-muted-foreground">Carregando…</p>;
  }

  if (!offer) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6 text-center">
        <AuttusWordmark onDark={false} align="center" />
        <p className="text-sm text-destructive">Link inválido ou expirado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-2xl space-y-4 bg-[hsl(var(--background))] p-4 pb-10 sm:p-6">
      <div className="space-y-1">
        <AuttusWordmark onDark={false} align="left" />
        <h1 className="flex items-center gap-2 text-lg font-semibold text-navy">
          <Camera className="h-5 w-5" /> Enviar fotos do veículo
        </h1>
        <p className="text-sm text-muted-foreground">
          Placa {formatPlate(offer.plate) || "—"}. Envie frente, traseira, laterais, painel,
          velocímetro (ligado) e até 15 fotos de avarias.
        </p>
      </div>
      <PhotoSlots offer={offer} onChange={setOffer} />
      <p className="text-xs text-muted-foreground">
        Ao terminar, avise o consignador — ele completa FIPE, lance e libera na vitrine.
      </p>
    </div>
  );
}

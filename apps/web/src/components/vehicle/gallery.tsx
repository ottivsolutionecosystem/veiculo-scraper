"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

export function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [active, setActive] = React.useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted text-muted-foreground">
        <ImageOff className="h-8 w-8" />
        <span className="text-sm">Sem fotos</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- data URI local, sem chamada de rede */}
      <img src={photos[active]} alt={alt} className="h-64 w-full rounded-lg object-cover" />
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {photos.map((photo, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "h-14 w-20 shrink-0 overflow-hidden rounded-md border-2",
                i === active ? "border-primary" : "border-transparent opacity-70",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- data URI local */}
              <img src={photo} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

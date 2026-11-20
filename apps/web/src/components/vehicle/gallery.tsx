"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Faixa opaca na base da foto — tapa a marca d'água da Shopcar
 * (costuma ficar no canto inferior) e coloca a Auttus no lugar.
 */
function PhotoBrandCover({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex items-center",
        "bg-navy-deep",
        // Shopcar costuma gravar marca larga e alta na base — faixa precisa cobrir.
        compact ? "h-6 justify-start px-1.5" : "h-16 justify-start px-3 sm:h-20 sm:px-4",
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- arte local em /public */}
      <img
        src="/brand/logo-wordmark-on-dark.png"
        alt=""
        className={cn(
          "w-auto object-contain object-left",
          compact ? "h-3.5 max-w-[4.5rem]" : "h-7 max-w-[10rem] sm:h-8 sm:max-w-[12rem]",
        )}
      />
    </div>
  );
}

export function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [active, setActive] = React.useState(0);
  const total = photos.length;

  React.useEffect(() => {
    setActive(0);
  }, [photos]);

  const touchX = React.useRef<number | null>(null);

  function go(delta: number) {
    if (total === 0) return;
    setActive((current) => (current + delta + total) % total);
  }

  if (total === 0) {
    return (
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground">
        <ImageOff className="h-8 w-8" />
        <span className="text-sm">Sem fotos</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="relative overflow-hidden rounded-xl bg-navy/[0.04]"
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
          if (dx > 40) go(-1);
          if (dx < -40) go(1);
          touchX.current = null;
        }}
      >
        <div className="relative flex aspect-[4/3] items-center justify-center sm:aspect-[16/10]">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL da fonte / data URI */}
          <img
            src={photos[active]}
            alt={alt}
            className="h-full w-full object-contain"
          />
          <PhotoBrandCover />
          {total > 1 ? (
            <span className="absolute right-2.5 top-2.5 z-[1] rounded-full bg-navy/80 px-2.5 py-0.5 text-xs font-medium text-white sm:right-3 sm:top-3">
              {active + 1} / {total}
            </span>
          ) : null}
        </div>
        {total > 1 && (
          <>
            <Button
              type="button"
              variant="navy"
              size="icon"
              className="absolute left-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full shadow-card sm:left-3 sm:h-9 sm:w-9"
              onClick={() => go(-1)}
              aria-label="Foto anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="navy"
              size="icon"
              className="absolute right-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full shadow-card sm:right-3 sm:h-9 sm:w-9"
              onClick={() => go(1)}
              aria-label="Próxima foto"
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 bg-muted",
                i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- data URI local */}
              <img src={photo} alt="" className="h-full w-full object-cover" />
              <PhotoBrandCover compact />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

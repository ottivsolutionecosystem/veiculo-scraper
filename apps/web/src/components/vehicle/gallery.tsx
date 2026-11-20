"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PhotoBrandBar({
  counter,
  compact = false,
}: {
  counter?: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2",
        "bg-gradient-to-t from-navy-deep/95 via-navy-deep/80 to-transparent",
        compact ? "px-1.5 pb-1 pt-4" : "px-3 pb-2.5 pt-8 sm:px-4 sm:pb-3",
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- arte local em /public */}
      <img
        src="/brand/logo-wordmark-on-dark.png"
        alt=""
        className={cn(
          "w-auto object-contain object-left opacity-95",
          compact ? "h-3 max-w-[4.5rem]" : "h-5 max-w-[7.5rem] sm:h-6 sm:max-w-[9rem]",
        )}
      />
      {counter ? (
        <span
          className={cn(
            "rounded-full bg-white/15 font-medium text-white/90",
            compact ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-0.5 text-xs",
          )}
        >
          {counter}
        </span>
      ) : null}
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
          <PhotoBrandBar counter={total > 1 ? `${active + 1} / ${total}` : null} />
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
              <PhotoBrandBar compact />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

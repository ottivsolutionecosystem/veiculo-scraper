"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Download, ImageOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError, downloadVehiclePhotosZip } from "@/lib/api";
import {
  PHOTO_BRAND_BAR_CLASS,
  PHOTO_BRAND_BAR_RATIO,
  PHOTO_BRAND_WORDMARK_SRC,
} from "@/lib/photo-brand";
import { cn } from "@/lib/utils";

/**
 * Faixa opaca full-width na base — esconde a marca Shopcar.
 * Mesma proporção do export (corta a base e recoloca Auttus).
 */
function PhotoBrandCover({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex items-center justify-start",
        PHOTO_BRAND_BAR_CLASS,
        compact ? "px-1.5" : "px-3 sm:px-4",
      )}
      style={{ height: `${PHOTO_BRAND_BAR_RATIO * 100}%` }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- arte local em /public */}
      <img
        src={PHOTO_BRAND_WORDMARK_SRC}
        alt=""
        className={cn(
          "w-auto object-contain object-left",
          compact ? "h-[40%] max-w-[45%]" : "h-[40%] max-w-[35%]",
        )}
      />
    </div>
  );
}

export function Gallery({
  photos,
  alt,
  vehicleId,
}: {
  photos: string[];
  alt: string;
  vehicleId?: number;
}) {
  const [active, setActive] = React.useState(0);
  const [exporting, setExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const total = photos.length;

  React.useEffect(() => {
    setActive(0);
  }, [photos]);

  const touchX = React.useRef<number | null>(null);

  function go(delta: number) {
    if (total === 0) return;
    setActive((current) => (current + delta + total) % total);
  }

  async function handleExport() {
    if (!vehicleId || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const blob = await downloadVehiclePhotosZip(vehicleId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fotos-${vehicleId}-auttus.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(
        err instanceof ApiError ? err.message : "Não foi possível baixar as fotos.",
      );
    } finally {
      setExporting(false);
    }
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
          <div className="absolute left-2.5 top-2.5 z-10 flex flex-wrap items-center gap-2 sm:left-3 sm:top-3">
            {vehicleId ? (
              <Button
                type="button"
                variant="navy"
                size="sm"
                className="h-8 gap-1.5 rounded-full px-3 shadow-card"
                disabled={exporting}
                onClick={() => void handleExport()}
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {exporting ? "Gerando…" : "Baixar fotos"}
              </Button>
            ) : null}
          </div>
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

      {exportError ? <p className="text-xs text-destructive">{exportError}</p> : null}

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

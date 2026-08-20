import { cn } from "@/lib/utils";

/** FIV oficial Auttus (PNG da marca). */
export function AuttusMark({
  className,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arte local em /public
    <img src="/brand/logo-mark.png" alt="" className={cn("h-8 w-8 object-contain", className)} />
  );
}

/** Wordmark oficial Auttus + nome do produto. */
export function AuttusWordmark({ onDark = true }: { onDark?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- arte local em /public */}
      <img
        src="/brand/logo-wordmark-on-dark.png"
        alt="Auttus"
        className="h-8 w-auto max-w-[11.5rem] object-contain object-left"
      />
      <p className={cn("text-[10px] font-medium tracking-wide", onDark ? "text-white/50" : "text-navy/50")}>
        Consignação inteligente
      </p>
    </div>
  );
}

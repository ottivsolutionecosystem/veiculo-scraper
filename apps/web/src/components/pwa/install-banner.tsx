"use client";

import * as React from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const DISMISS_KEY = "auttus:pwa-install-dismissed";

type BeforeInstallPrompt = Event & { prompt: () => Promise<void> };

export function InstallBanner() {
  const [promptEvent, setPromptEvent] = React.useState<BeforeInstallPrompt | null>(null);
  const [iosHint, setIosHint] = React.useState(false);
  const [hidden, setHidden] = React.useState(true);

  React.useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY)) return;
    const iosStandalone =
      "standalone" in window.navigator && Boolean((window.navigator as { standalone?: boolean }).standalone);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
    if (standalone) return;

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (ios) {
      setIosHint(true);
      setHidden(false);
      return;
    }

    function onPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPrompt);
      setHidden(false);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 z-40 mx-auto max-w-lg px-3 md:bottom-4 md:px-0 max-md:bottom-[calc(4.25rem+env(safe-area-inset-bottom))]">
      <div className="flex items-start gap-3 rounded-xl border bg-card p-3 shadow-card">
        <Download className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 text-sm">
          {iosHint
            ? "No Safari: Compartilhar → Adicionar à Tela de Início."
            : "Instale a Auttus na tela inicial para ligar e trabalhar sem o navegador."}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {promptEvent && (
            <Button size="sm" className="min-h-11" onClick={() => void install()}>
              Instalar
            </Button>
          )}
          <Button size="icon" variant="ghost" className="min-h-11 min-w-11" onClick={dismiss} aria-label="Dispensar">
            <X />
          </Button>
        </div>
      </div>
    </div>
  );
}

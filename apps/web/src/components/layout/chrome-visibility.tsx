"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { reduceHideOnScroll } from "@/lib/hide-on-scroll";

const MD = 768;
const FIELD = "input, textarea, select, [contenteditable=true]";

type ChromeVisibility = {
  hidden: boolean;
  onScrollFrame: (el: HTMLElement) => void;
  lockChrome: (id: string, locked: boolean) => void;
};

const ChromeVisibilityContext = React.createContext<ChromeVisibility>({
  hidden: false,
  onScrollFrame: () => {},
  lockChrome: () => {},
});

export function useChromeVisibility() {
  return React.useContext(ChromeVisibilityContext);
}

function isField(el: EventTarget | null) {
  return el instanceof HTMLElement && el.matches(FIELD);
}

export function ChromeVisibilityProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [hidden, setHidden] = React.useState(false);
  const [locks, setLocks] = React.useState<ReadonlySet<string>>(() => new Set());
  const lastTop = React.useRef(new WeakMap<HTMLElement, number>());
  const accumulated = React.useRef(0);
  const hiddenRef = React.useRef(false);
  const locksRef = React.useRef(locks);
  locksRef.current = locks;
  hiddenRef.current = hidden;

  const reveal = React.useCallback(() => {
    accumulated.current = 0;
    if (hiddenRef.current) {
      hiddenRef.current = false;
      setHidden(false);
    }
  }, []);

  React.useEffect(() => {
    reveal();
  }, [pathname, reveal]);

  React.useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MD}px)`);
    const apply = () => {
      if (mq.matches) reveal();
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [reveal]);

  React.useEffect(() => {
    if (locks.size > 0) reveal();
  }, [locks, reveal]);

  const lockChrome = React.useCallback((id: string, locked: boolean) => {
    setLocks((prev) => {
      const has = prev.has(id);
      if (locked && has) return prev;
      if (!locked && !has) return prev;
      const next = new Set(prev);
      if (locked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  React.useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (isField(e.target)) lockChrome("keyboard", true);
    };
    const onFocusOut = () => {
      window.setTimeout(() => {
        if (!isField(document.activeElement)) lockChrome("keyboard", false);
      }, 80);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [lockChrome]);

  const onScrollFrame = React.useCallback(
    (el: HTMLElement) => {
      const scrollTop = el.scrollTop;
      const prevTop = lastTop.current.get(el) ?? 0;
      const delta = scrollTop - prevTop;
      lastTop.current.set(el, scrollTop);

      if (typeof window !== "undefined" && window.innerWidth >= MD) {
        reveal();
        return;
      }
      if (locksRef.current.size > 0) {
        reveal();
        return;
      }

      const next = reduceHideOnScroll(
        { hidden: hiddenRef.current, accumulated: accumulated.current },
        { scrollTop, delta },
      );
      accumulated.current = next.accumulated;
      if (next.hidden !== hiddenRef.current) {
        hiddenRef.current = next.hidden;
        setHidden(next.hidden);
      }
    },
    [reveal],
  );

  const value = React.useMemo(
    () => ({ hidden, onScrollFrame, lockChrome }),
    [hidden, onScrollFrame, lockChrome],
  );

  return <ChromeVisibilityContext.Provider value={value}>{children}</ChromeVisibilityContext.Provider>;
}

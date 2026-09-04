"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { reduceHideOnScroll, type HideOnScrollState } from "@/lib/hide-on-scroll";

const MD = 768;

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

export function ChromeVisibilityProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = React.useState<HideOnScrollState>({ hidden: false, accumulated: 0 });
  const [locks, setLocks] = React.useState<ReadonlySet<string>>(() => new Set());
  const lastTop = React.useRef(new WeakMap<HTMLElement, number>());
  const locksRef = React.useRef(locks);
  locksRef.current = locks;

  React.useEffect(() => {
    setState({ hidden: false, accumulated: 0 });
  }, [pathname]);

  React.useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MD}px)`);
    const apply = () => {
      if (mq.matches) setState({ hidden: false, accumulated: 0 });
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  React.useEffect(() => {
    if (locks.size > 0) setState({ hidden: false, accumulated: 0 });
  }, [locks]);

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

  const onScrollFrame = React.useCallback((el: HTMLElement) => {
    const scrollTop = el.scrollTop;
    const prevTop = lastTop.current.get(el) ?? 0;
    const delta = scrollTop - prevTop;
    lastTop.current.set(el, scrollTop);

    if (typeof window !== "undefined" && window.innerWidth >= MD) {
      setState({ hidden: false, accumulated: 0 });
      return;
    }
    if (locksRef.current.size > 0) {
      setState({ hidden: false, accumulated: 0 });
      return;
    }
    setState((current) => reduceHideOnScroll(current, { scrollTop, delta }));
  }, []);

  const value = React.useMemo(
    () => ({ hidden: state.hidden, onScrollFrame, lockChrome }),
    [state.hidden, onScrollFrame, lockChrome],
  );

  return <ChromeVisibilityContext.Provider value={value}>{children}</ChromeVisibilityContext.Provider>;
}

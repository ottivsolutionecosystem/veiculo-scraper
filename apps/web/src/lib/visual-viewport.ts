"use client";

import * as React from "react";

export type VisualViewportFrame = {
  height: number;
  offsetTop: number;
};

function readFrame(): VisualViewportFrame {
  if (typeof window === "undefined") return { height: 0, offsetTop: 0 };
  const vv = window.visualViewport;
  return {
    height: vv?.height ?? window.innerHeight,
    offsetTop: vv?.offsetTop ?? 0,
  };
}

/** Área visível real — encolhe quando o teclado do iOS sobe, sem mexer no layout. */
export function useVisualViewportFrame() {
  const [frame, setFrame] = React.useState(readFrame);

  React.useEffect(() => {
    const apply = () => setFrame(readFrame());
    apply();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  return frame;
}

/** Altura visível real (cai quando o teclado do iOS sobe). */
export function useVisualViewportHeight() {
  return useVisualViewportFrame().height;
}

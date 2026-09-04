"use client";

import * as React from "react";

/** Altura visível real (cai quando o teclado do iOS sobe). */
export function useVisualViewportHeight() {
  const [height, setHeight] = React.useState(() =>
    typeof window === "undefined" ? 0 : (window.visualViewport?.height ?? window.innerHeight),
  );

  React.useEffect(() => {
    const vv = window.visualViewport;
    const apply = () => setHeight(vv?.height ?? window.innerHeight);
    apply();
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  return height;
}

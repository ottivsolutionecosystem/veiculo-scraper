export const CONSORCIO_NAV = [
  {
    href: "/consorcio/oferecimentos",
    label: "Oferecimentos",
    match: (path: string) => path.startsWith("/consorcio/oferecimentos"),
  },
  {
    href: "/consorcio/vitrine",
    label: "Vitrine",
    match: (path: string) => path.startsWith("/consorcio/vitrine"),
  },
  {
    href: "/consorcio/cartas",
    label: "Cartas",
    match: (path: string) => path.startsWith("/consorcio/cartas"),
  },
] as const;

export const CONSORCIO_NOVO_HREF = "/consorcio/oferecimentos/novo";

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Auttus · Consignação inteligente",
    short_name: "Auttus",
    description: "Fila, kanban e estoque de consignação Auttus.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0f1c33",
    theme_color: "#0f1c33",
    lang: "pt-BR",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

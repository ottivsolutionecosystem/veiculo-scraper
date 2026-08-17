import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Captação de Veículos",
    template: "%s · Captação de Veículos",
  },
  description:
    "Coleta, ranqueia e organiza a captação de veículos para repasse e consignação.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}

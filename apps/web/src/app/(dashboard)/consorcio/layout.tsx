import { ConsorcioNav } from "@/components/consorcio/consorcio-nav";

export default function ConsorcioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ConsorcioNav />
      {children}
    </>
  );
}

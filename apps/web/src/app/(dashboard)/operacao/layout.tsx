import { RequireMaster } from "@/components/auth/require-master";

export default function OperacaoLayout({ children }: { children: React.ReactNode }) {
  return <RequireMaster>{children}</RequireMaster>;
}

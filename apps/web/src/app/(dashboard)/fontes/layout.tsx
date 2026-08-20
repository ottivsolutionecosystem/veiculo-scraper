import { RequireMaster } from "@/components/auth/require-master";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RequireMaster>{children}</RequireMaster>;
}

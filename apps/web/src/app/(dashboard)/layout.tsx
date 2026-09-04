import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { InstallBanner } from "@/components/pwa/install-banner";
import { RequireAuth } from "@/components/auth/require-auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex h-dvh max-h-dvh overflow-hidden">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-[env(safe-area-inset-bottom)]">
            {children}
          </main>
        </div>
        <BottomNav />
        <InstallBanner />
      </div>
    </RequireAuth>
  );
}

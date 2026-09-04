import { Sidebar } from "@/components/layout/sidebar";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ChromeVisibilityProvider } from "@/components/layout/chrome-visibility";
import { BottomNav } from "@/components/layout/bottom-nav";
import { InstallBanner } from "@/components/pwa/install-banner";
import { RequireAuth } from "@/components/auth/require-auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <ChromeVisibilityProvider>
        <div className="flex h-dvh max-h-dvh overflow-hidden">
          <Sidebar />
          <DashboardShell>{children}</DashboardShell>
          <BottomNav />
          <InstallBanner />
        </div>
      </ChromeVisibilityProvider>
    </RequireAuth>
  );
}

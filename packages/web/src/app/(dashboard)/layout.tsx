import { SidebarLayout } from "@/components/sidebar-layout";
import { AuthGuard } from "@/components/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarLayout>{children}</SidebarLayout>
    </AuthGuard>
  );
}

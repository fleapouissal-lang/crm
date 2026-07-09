import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { FusionDashboardView } from "@/components/dashboard/fusion-dashboard-view";
import { PlatformAdminDashboard } from "@/components/dashboard/platform-admin-dashboard";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { getPlatformAdminStats } from "@/lib/actions/platform-admin";
import { getCurrentProfile } from "@/lib/actions/auth";
import { isPlatformAdmin } from "@/lib/permissions";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (isPlatformAdmin(profile.role)) {
    const stats = await getPlatformAdminStats();
    if (!stats) redirect("/login");
    return (
      <PageTransition>
        <PlatformAdminDashboard stats={stats} />
      </PageTransition>
    );
  }

  const stats = await getDashboardStats();

  return (
    <PageTransition>
      <FusionDashboardView activities={stats.activities} />
    </PageTransition>
  );
}

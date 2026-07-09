import { PageTransition } from "@/components/shared/page-transition";
import { FusionDashboardView } from "@/components/dashboard/fusion-dashboard-view";
import { getDashboardStats } from "@/lib/actions/dashboard";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <PageTransition>
      <FusionDashboardView activities={stats.activities} />
    </PageTransition>
  );
}

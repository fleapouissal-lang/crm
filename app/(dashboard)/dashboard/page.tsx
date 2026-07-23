import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/shared/page-transition";
import { FusionDashboardView } from "@/components/dashboard/fusion-dashboard-view";
import { PlatformAdminDashboard } from "@/components/dashboard/platform-admin-dashboard";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { getPlatformAdminStats } from "@/lib/actions/platform-admin";
import { getProjects } from "@/lib/actions/projects";
import { getTasks } from "@/lib/actions/tasks";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  canAccessCalendar,
  isLeadership,
  isPlatformAdmin,
} from "@/lib/permissions";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardFallback() {
  return (
    <div className="space-y-[18px]">
      <div className="fl-card fl-pad space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid g-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="fl-card fl-pad space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function DashboardContent() {
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

  const loadCalendarTasks =
    !isLeadership(profile) && canAccessCalendar(profile);

  const [stats, projects, tasks] = await Promise.all([
    getDashboardStats(),
    getProjects(),
    loadCalendarTasks ? getTasks() : Promise.resolve([]),
  ]);

  return (
    <PageTransition>
      <FusionDashboardView
        stats={stats}
        profile={profile}
        projects={projects}
        tasks={tasks}
      />
    </PageTransition>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}

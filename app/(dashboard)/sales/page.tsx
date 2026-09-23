import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { getLeads } from "@/lib/actions/leads";
import { canAccessLeads } from "@/lib/permissions";
import { SalesOverviewPage } from "@/components/sales/sales-overview-page";
import { DiscoverDashboard } from "@/components/leads/discover-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/shared/page-transition";

async function SalesContent() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!canAccessLeads(profile)) redirect("/dashboard");

  const [leads, profiles] = await Promise.all([getLeads(), getOrgProfiles()]);

  return (
    <PageTransition>
      <div className="space-y-[18px]">
        <div className="fl-card fl-pad">
          <DiscoverDashboard leads={leads} showByProject />
        </div>
        <SalesOverviewPage leads={leads} profiles={profiles} />
      </div>
    </PageTransition>
  );
}

export default function SalesRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-[28rem] w-full" />
        </div>
      }
    >
      <SalesContent />
    </Suspense>
  );
}

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getLeads } from "@/lib/actions/leads";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { LeadsPageClient } from "@/components/leads/leads-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");

  const params = await searchParams;
  const [leads, profiles] = await Promise.all([
    getLeads({ q: params.q, stage: params.stage }),
    getOrgProfiles(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <LeadsPageClient
        leads={leads}
        profiles={profiles}
        organizationId={profile.organization_id}
        role={profile.role}
      />
    </Suspense>
  );
}

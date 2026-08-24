import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { getLeads } from "@/lib/actions/leads";
import { getOutreachMessages } from "@/lib/actions/outreach";
import { canAccessLeads } from "@/lib/permissions";
import { LeadsPageClient } from "@/components/leads/leads-page-client";
import { Skeleton } from "@/components/ui/skeleton";

async function SalesWorkspace() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!canAccessLeads(profile)) redirect("/dashboard");

  const [leads, profiles, outreachMessages] = await Promise.all([
    getLeads(),
    getOrgProfiles(),
    getOutreachMessages(),
  ]);

  return (
    <LeadsPageClient
      leads={leads}
      profiles={profiles}
      outreachMessages={outreachMessages}
      organizationId={profile.organization_id}
      role={profile.role}
    />
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
      <SalesWorkspace />
    </Suspense>
  );
}

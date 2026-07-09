import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { HrPageClient } from "@/components/hr/hr-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export default async function HrRoutePage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");

  const profiles = await getOrgProfiles();

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <HrPageClient profiles={profiles} />
    </Suspense>
  );
}

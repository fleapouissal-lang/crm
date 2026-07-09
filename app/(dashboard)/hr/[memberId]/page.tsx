import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { EmployeeProfilePageClient } from "@/components/hr/employee-profile-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export default async function HrMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const current = await getCurrentProfile();
  if (!current?.organization_id) redirect("/login");

  const { memberId } = await params;
  const profiles = await getOrgProfiles();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <EmployeeProfilePageClient memberId={memberId} profiles={profiles} />
    </Suspense>
  );
}

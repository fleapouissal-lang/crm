import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getHrWorkspace } from "@/lib/actions/hr";
import { SalaryAccountPageClient } from "@/components/hr/salary-account-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export default async function HrSalaryAccountPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const data = await getHrWorkspace();
  if (!data) redirect("/dashboard");

  const { memberId } = await params;

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
      <SalaryAccountPageClient
        memberId={memberId}
        profiles={data.teamProfiles}
        initialHrProfiles={data.hrProfiles}
      />
    </Suspense>
  );
}

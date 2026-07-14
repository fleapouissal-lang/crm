import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getHrWorkspace } from "@/lib/actions/hr";
import { HrPageClient } from "@/components/hr/hr-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export default async function HrRoutePage() {
  const data = await getHrWorkspace();
  if (!data) redirect("/dashboard");

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <HrPageClient
        profiles={data.teamProfiles}
        initialHrProfiles={data.hrProfiles}
      />
    </Suspense>
  );
}

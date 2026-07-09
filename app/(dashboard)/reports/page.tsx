import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import {
  getReportsData,
  type ReportsPeriod,
} from "@/lib/actions/reports";
import { ReportsPageClient } from "@/components/reports/reports-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ReportsRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");

  const params = await searchParams;
  const period = (
    ["weekly", "monthly", "quarterly"].includes(params.period ?? "")
      ? params.period
      : "monthly"
  ) as ReportsPeriod;

  const data = await getReportsData(period);

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      }
    >
      <ReportsPageClient data={data} />
    </Suspense>
  );
}

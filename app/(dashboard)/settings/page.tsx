import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSettingsData } from "@/lib/actions/settings";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export default async function SettingsRoutePage() {
  const data = await getSettingsData();
  if (!data) redirect("/login");

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <SettingsPageClient data={data} />
    </Suspense>
  );
}

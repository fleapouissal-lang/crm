import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canAccessReports } from "@/lib/permissions";
import { ReportsPageClient } from "@/components/reports/reports-page-client";

export default async function ReportsRoutePage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!canAccessReports(profile)) redirect("/dashboard");

  return <ReportsPageClient />;
}

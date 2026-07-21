import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canViewFinanceDocumentsForRole } from "@/lib/permissions";
import { FinanceOverviewPage } from "@/components/finance/finance-overview-page";

export default async function FinanceRoutePage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!canViewFinanceDocumentsForRole(profile.role)) redirect("/dashboard");

  return <FinanceOverviewPage />;
}

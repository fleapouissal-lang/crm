import { redirect } from "next/navigation";
import { getLeads } from "@/lib/actions/leads";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { isLeadership } from "@/lib/permissions";
import { SalesOverviewPage } from "@/components/sales/sales-overview-page";

export default async function SalesRoutePage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!isLeadership(profile)) redirect("/dashboard");

  const [leads, profiles] = await Promise.all([getLeads(), getOrgProfiles()]);

  return <SalesOverviewPage leads={leads} profiles={profiles} />;
}

import { redirect } from "next/navigation";
import { getLeads } from "@/lib/actions/leads";
import { getCurrentProfile } from "@/lib/actions/auth";
import { MarketingOverviewPage } from "@/components/marketing/marketing-overview-page";

export default async function MarketingRoutePage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");

  const leads = await getLeads();
  return <MarketingOverviewPage leads={leads} />;
}

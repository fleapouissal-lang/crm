import { notFound, redirect } from "next/navigation";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { getLead } from "@/lib/actions/leads";
import { getTasksForLead } from "@/lib/actions/tasks";
import { canAccessLeads } from "@/lib/permissions";
import { LeadDetailClient } from "@/components/leads/lead-detail";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!canAccessLeads(profile)) redirect("/dashboard");
  const { id } = await params;
  const [lead, profiles, tasks] = await Promise.all([
    getLead(id),
    getOrgProfiles(),
    getTasksForLead(id),
  ]);
  if (!lead) notFound();
  return <LeadDetailClient lead={lead} tasks={tasks} profiles={profiles} role={profile.role} />;
}

import { notFound, redirect } from "next/navigation";
import { getLead } from "@/lib/actions/leads";
import { getTasksForLead } from "@/lib/actions/tasks";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { LeadDetailClient } from "@/components/leads/lead-detail";

export default async function CrmLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [lead, tasks, profiles] = await Promise.all([
    getLead(id),
    getTasksForLead(id),
    getOrgProfiles(),
  ]);

  if (!lead) notFound();

  return (
    <LeadDetailClient
      lead={lead}
      tasks={tasks}
      profiles={profiles}
      role={profile.role}
    />
  );
}

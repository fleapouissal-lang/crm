import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { CreateTaskPageClient } from "@/components/tasks/create-task-page-client";
import { getLeads } from "@/lib/actions/leads";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { canAccessTasks } from "@/lib/permissions";

export default async function CreateTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ lead_id?: string; due_date?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!canAccessTasks(profile)) redirect("/dashboard");

  const params = await searchParams;
  const [profiles, leads] = await Promise.all([getOrgProfiles(), getLeads()]);

  return (
    <PageTransition>
      <CreateTaskPageClient
        profiles={profiles}
        leads={leads}
        defaultLeadId={params.lead_id}
        defaultDueDate={params.due_date}
      />
    </PageTransition>
  );
}

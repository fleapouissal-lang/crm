import { redirect } from "next/navigation";
import { PageTransition } from "@/components/shared/page-transition";
import { CreateTaskPageClient } from "@/components/tasks/create-task-page-client";
import { getProjects } from "@/lib/actions/projects";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { canAccessTasks } from "@/lib/permissions";

export default async function CreateTaskPage({
  searchParams,
}: {
  searchParams: Promise<{
    due_date?: string;
    status?: string;
    project_id?: string;
    phase?: string;
  }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!canAccessTasks(profile)) redirect("/dashboard");

  const params = await searchParams;
  const [profiles, projects] = await Promise.all([
    getOrgProfiles(),
    getProjects(),
  ]);

  return (
    <PageTransition>
      <CreateTaskPageClient
        profiles={profiles}
        projects={projects}
        currentUserId={profile.id}
        defaultDueDate={params.due_date}
        defaultStatus={params.status}
        defaultProjectId={params.project_id}
        defaultTaskPhase={params.phase}
      />
    </PageTransition>
  );
}

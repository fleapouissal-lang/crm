import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTasks } from "@/lib/actions/tasks";
import { getLeads } from "@/lib/actions/leads";
import { getProjects } from "@/lib/actions/projects";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { canAccessTasks } from "@/lib/permissions";
import { TasksPageClient } from "@/components/tasks/tasks-page-client";
import { Skeleton } from "@/components/ui/skeleton";

function TasksFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

async function TasksContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; lead_id?: string; project_id?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) redirect("/login");
  if (!canAccessTasks(profile)) redirect("/dashboard");

  const params = await searchParams;
  const [tasks, profiles, leads, projects] = await Promise.all([
    getTasks({ status: params.status }),
    getOrgProfiles(),
    getLeads(),
    getProjects(),
  ]);

  return (
    <TasksPageClient
      tasks={tasks}
      profiles={profiles}
      leads={leads}
      projects={projects}
      organizationId={profile.organization_id}
      profile={profile}
    />
  );
}

export default function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; lead_id?: string; project_id?: string }>;
}) {
  return (
    <Suspense fallback={<TasksFallback />}>
      <TasksContent searchParams={searchParams} />
    </Suspense>
  );
}

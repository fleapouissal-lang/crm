import { notFound, redirect } from "next/navigation";
import { getTask } from "@/lib/actions/tasks";
import { getProjects } from "@/lib/actions/projects";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { canAccessTasks, isLeadership } from "@/lib/permissions";
import { TaskDetailClient } from "@/components/tasks/task-detail";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canAccessTasks(profile)) redirect("/dashboard");

  const [task, profiles, projects] = await Promise.all([
    getTask(id),
    getOrgProfiles(),
    isLeadership(profile) ? getProjects() : Promise.resolve([]),
  ]);

  if (!task) notFound();

  return (
    <TaskDetailClient
      task={task}
      profiles={profiles}
      projects={projects}
      profile={profile}
    />
  );
}

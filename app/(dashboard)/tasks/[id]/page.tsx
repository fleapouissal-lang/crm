import { notFound, redirect } from "next/navigation";
import { getTask } from "@/lib/actions/tasks";
import { getLeads } from "@/lib/actions/leads";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import { TaskDetailClient } from "@/components/tasks/task-detail";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [task, profiles, leads] = await Promise.all([
    getTask(id),
    getOrgProfiles(),
    getLeads(),
  ]);

  if (!task) notFound();

  return (
    <TaskDetailClient
      task={task}
      profiles={profiles}
      leads={leads}
      profile={profile}
    />
  );
}

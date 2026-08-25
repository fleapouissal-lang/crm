"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/actions/auth";
import {
  canAccessTasks,
  canCreateTask,
  canDeleteTaskForProfile,
  canModifyTask,
  canViewAllTasks,
} from "@/lib/permissions";
import { taskSchema, normalizeAssigneeIds } from "@/lib/validations/task";
import { isTaskDoneStatus } from "@/lib/tasks/status";
import { memberTaskOrFilter } from "@/lib/tasks/visibility";
import { inferTaskPhase, normalizeTaskPhase } from "@/lib/tasks/phases";
import type {
  ActionResult,
  ActivityType,
  Task,
  TaskComment,
  TaskDependency,
  TaskResource,
  TaskSubtask,
  TaskWorkspaceData,
  TaskPriority,
  TaskStatus,
} from "@/types/database";

function resolveAssignees(
  profile: { id: string },
  values: { assignee_ids?: string[] | null; assigned_to?: string | null },
  options?: { requireSelf?: boolean }
): { assigneeIds: string[]; assignedTo: string | null } {
  let assigneeIds = normalizeAssigneeIds(values);
  if (options?.requireSelf && !assigneeIds.includes(profile.id)) {
    // Keep the first selected person as primary assignee; creator stays on the task.
    assigneeIds = [...assigneeIds, profile.id];
  }
  if (!assigneeIds.length) {
    return { assigneeIds: [profile.id], assignedTo: profile.id };
  }
  return {
    assigneeIds,
    assignedTo: assigneeIds[0] ?? null,
  };
}

async function logActivity(
  orgId: string,
  userId: string,
  type: ActivityType,
  entityId: string,
  message: string
) {
  const supabase = await createClient();
  await supabase.from("activities").insert({
    organization_id: orgId,
    type,
    entity_type: "task",
    entity_id: entityId,
    message,
    user_id: userId,
  });
}

async function fetchTaskForAccess(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, assigned_to, assignee_ids, created_by, organization_id, title, task_phase")
    .eq("id", id)
    .single();
  return data;
}

export async function getTasks(filters?: {
  status?: string;
  due_date?: string;
}): Promise<Task[]> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return [];
  if (!canAccessTasks(profile)) return [];

  let query = supabase
    .from("tasks")
    .select(
      "*, assigned_profile:profiles!tasks_assigned_to_fkey(*), created_profile:profiles!tasks_created_by_fkey(*), lead:leads!tasks_lead_id_fkey(*)"
    )
    .eq("organization_id", profile.organization_id)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (!canViewAllTasks(profile)) {
    query = query.or(memberTaskOrFilter(profile.id));
  }

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.due_date) {
    query = query.eq("due_date", filters.due_date);
  }

  const { data } = await query;
  return (data as Task[]) ?? [];
}

export async function getTask(id: string): Promise<Task | null> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(
      "*, assigned_profile:profiles!tasks_assigned_to_fkey(*), created_profile:profiles!tasks_created_by_fkey(*), lead:leads!tasks_lead_id_fkey(*)"
    )
    .eq("id", id)
    .single();

  const task = data as Task | null;
  if (!task || task.organization_id !== profile.organization_id) return null;
  if (!canViewAllTasks(profile) && !canModifyTask(profile, task)) return null;

  return task;
}

export async function getTasksForLead(leadId: string): Promise<Task[]> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return [];

  let query = supabase
    .from("tasks")
    .select(
      "*, assigned_profile:profiles!tasks_assigned_to_fkey(*), created_profile:profiles!tasks_created_by_fkey(*)"
    )
    .eq("lead_id", leadId)
    .eq("organization_id", profile.organization_id)
    .order("due_date", { ascending: true });

  if (!canViewAllTasks(profile)) {
    query = query.or(memberTaskOrFilter(profile.id));
  }

  const { data } = await query;
  return (data as Task[]) ?? [];
}

export async function createTask(
  input: unknown
): Promise<ActionResult<Task>> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!canCreateTask(profile)) {
    return { success: false, error: "You don't have permission to create tasks" };
  }

  const values = parsed.data;
  const { assigneeIds, assignedTo } = resolveAssignees(profile, values, {
    requireSelf: true,
  });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: profile.organization_id,
      title: values.title,
      description: values.description || null,
      status: values.status as TaskStatus,
      priority: values.priority as TaskPriority,
      due_date: values.due_date || null,
      assigned_to: assignedTo,
      assignee_ids: assigneeIds,
      lead_id: null,
      project_id: values.project_id || null,
      task_phase: normalizeTaskPhase(values.task_phase) ?? inferTaskPhase(values.title),
      acceptance_criteria: values.acceptance_criteria?.trim() || null,
      estimated_minutes: values.estimated_minutes ?? null,
      tracked_minutes: values.tracked_minutes ?? 0,
      next_step: values.next_step?.trim() || null,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logActivity(
    profile.organization_id,
    profile.id,
    "task_created",
    data.id,
    `Created task "${data.title}"`
  );

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true, data: data as Task };
}

export async function updateTask(
  id: string,
  input: unknown
): Promise<ActionResult<Task>> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }

  const existing = await fetchTaskForAccess(id);
  if (!existing || existing.organization_id !== profile.organization_id) {
    return { success: false, error: "Task not found" };
  }
  if (!canModifyTask(profile, existing)) {
    return { success: false, error: "You don't have permission to edit this task" };
  }

  const values = parsed.data;
  const { assigneeIds, assignedTo } = resolveAssignees(profile, values);
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
      title: values.title,
      description: values.description || null,
      status: values.status as TaskStatus,
      priority: values.priority as TaskPriority,
      due_date: values.due_date || null,
      assigned_to: assignedTo,
      assignee_ids: assigneeIds,
      project_id: values.project_id || null,
      task_phase:
        normalizeTaskPhase(values.task_phase) ??
        inferTaskPhase(values.title) ??
        existing.task_phase ??
        null,
      last_modified_by: profile.id,
  };
  if (values.acceptance_criteria !== undefined) {
    updatePayload.acceptance_criteria = values.acceptance_criteria?.trim() || null;
  }
  if (values.estimated_minutes !== undefined) {
    updatePayload.estimated_minutes = values.estimated_minutes ?? null;
  }
  if (values.tracked_minutes !== undefined) {
    updatePayload.tracked_minutes = values.tracked_minutes ?? 0;
  }
  if (values.next_step !== undefined) {
    updatePayload.next_step = values.next_step?.trim() || null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  const activityType: ActivityType = isTaskDoneStatus(
    values.status as TaskStatus
  )
    ? "task_completed"
    : "task_updated";
  await logActivity(
    profile.organization_id,
    profile.id,
    activityType,
    id,
    isTaskDoneStatus(values.status as TaskStatus)
      ? `Completed task "${data.title}"`
      : `Updated task "${data.title}"`
  );

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/dashboard");
  return { success: true, data: data as Task };
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<ActionResult<Task>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }

  const existing = await fetchTaskForAccess(id);
  if (!existing || existing.organization_id !== profile.organization_id) {
    return { success: false, error: "Task not found" };
  }
  if (!canModifyTask(profile, existing)) {
    return { success: false, error: "You don't have permission to update this task" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status, last_modified_by: profile.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await logActivity(
    profile.organization_id,
    profile.id,
    isTaskDoneStatus(status) ? "task_completed" : "task_updated",
    id,
    isTaskDoneStatus(status)
      ? `Completed task "${data.title}"`
      : `Updated task "${data.title}" status`
  );

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true, data: data as Task };
}

type TaskMutationContext =
  | { error: "Not authenticated" | "Task not found" | "You don't have permission to edit this task" }
  | {
      profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>> & { organization_id: string };
      existing: NonNullable<Awaited<ReturnType<typeof fetchTaskForAccess>>> & {
        organization_id: string;
        title: string;
      };
    };

async function getTaskMutationContext(id: string): Promise<TaskMutationContext> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { error: "Not authenticated" as const };
  const existing = await fetchTaskForAccess(id);
  if (!existing || existing.organization_id !== profile.organization_id) {
    return { error: "Task not found" as const };
  }
  if (!canModifyTask(profile, existing)) {
    return { error: "You don't have permission to edit this task" as const };
  }
  return {
    profile: profile as TaskMutationContext extends { profile: infer P } ? P : never,
    existing: existing as TaskMutationContext extends { existing: infer E } ? E : never,
  };
}

export async function getTaskWorkspace(id: string): Promise<TaskWorkspaceData> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessTasks(profile)) {
    return { subtasks: [], dependencies: [], resources: [], comments: [], activities: [], availableTasks: [] };
  }

  const supabase = await createClient();
  const [subtasksRes, dependenciesRes, resourcesRes, commentsRes, activitiesRes, tasksRes] =
    await Promise.all([
      supabase
        .from("task_subtasks")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("task_id", id)
        .order("position", { ascending: true }),
      supabase
        .from("task_dependencies")
        .select("*, related_task:tasks!task_dependencies_related_task_id_fkey(id, title, status)")
        .eq("organization_id", profile.organization_id)
        .eq("task_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("task_resources")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("task_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("task_comments")
        .select("*, profile:profiles!task_comments_created_by_fkey(*)")
        .eq("organization_id", profile.organization_id)
        .eq("task_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("activities")
        .select("*, profile:profiles!activities_user_id_fkey(*)")
        .eq("organization_id", profile.organization_id)
        .eq("entity_type", "task")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("tasks")
        .select("id, title, status")
        .eq("organization_id", profile.organization_id)
        .neq("id", id)
        .order("title", { ascending: true })
        .limit(200),
    ]);

  return {
    subtasks: (subtasksRes.data ?? []) as TaskSubtask[],
    dependencies: (dependenciesRes.data ?? []) as TaskDependency[],
    resources: (resourcesRes.data ?? []) as TaskResource[],
    comments: (commentsRes.data ?? []) as TaskComment[],
    activities: (activitiesRes.data ?? []) as TaskWorkspaceData["activities"],
    availableTasks: (tasksRes.data ?? []) as TaskWorkspaceData["availableTasks"],
  };
}

export async function addTaskComment(id: string, body: string): Promise<ActionResult<TaskComment>> {
  const gate = await getTaskMutationContext(id);
  if ("error" in gate) return { success: false, error: gate.error };
  const text = body.trim();
  if (!text) return { success: false, error: "Comment cannot be empty" };
  if (text.length > 5000) return { success: false, error: "Comment is too long" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_comments")
    .insert({ organization_id: gate.profile.organization_id, task_id: id, body: text, created_by: gate.profile.id })
    .select("*, profile:profiles!task_comments_created_by_fkey(*)")
    .single();
  if (error) return { success: false, error: error.message };
  await logActivity(gate.profile.organization_id, gate.profile.id, "task_updated", id, `Commented on task "${gate.existing.title}"`);
  revalidatePath(`/tasks/${id}`);
  return { success: true, data: data as TaskComment };
}

export async function addTaskSubtask(id: string, title: string): Promise<ActionResult<TaskSubtask>> {
  const gate = await getTaskMutationContext(id);
  if ("error" in gate) return { success: false, error: gate.error };
  const text = title.trim();
  if (!text) return { success: false, error: "Subtask title is required" };
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("task_subtasks")
    .select("position")
    .eq("organization_id", gate.profile.organization_id)
    .eq("task_id", id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("task_subtasks")
    .insert({ organization_id: gate.profile.organization_id, task_id: id, title: text, position: (last?.position ?? -1) + 1, created_by: gate.profile.id })
    .select("*")
    .single();
  if (error) return { success: false, error: error.message };
  await logActivity(gate.profile.organization_id, gate.profile.id, "task_updated", id, `Added a subtask to "${gate.existing.title}"`);
  revalidatePath(`/tasks/${id}`);
  return { success: true, data: data as TaskSubtask };
}

export async function toggleTaskSubtask(subtaskId: string, isCompleted: boolean): Promise<ActionResult<TaskSubtask>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return { success: false, error: "Not authenticated" };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("task_subtasks")
    .select("*")
    .eq("id", subtaskId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  if (!existing) return { success: false, error: "Subtask not found" };
  const gate = await getTaskMutationContext(existing.task_id);
  if ("error" in gate) return { success: false, error: gate.error };
  const { data, error } = await supabase.from("task_subtasks").update({ is_completed: isCompleted }).eq("id", subtaskId).select("*").single();
  if (error) return { success: false, error: error.message };
  revalidatePath(`/tasks/${existing.task_id}`);
  return { success: true, data: data as TaskSubtask };
}

export async function addTaskDependency(
  id: string,
  relatedTaskId: string,
  relation: "depends_on" | "blocks" | "relates_to"
): Promise<ActionResult<TaskDependency>> {
  const gate = await getTaskMutationContext(id);
  if ("error" in gate) return { success: false, error: gate.error };
  if (id === relatedTaskId) return { success: false, error: "A task cannot depend on itself" };
  const supabase = await createClient();
  const { data: related } = await supabase.from("tasks").select("id").eq("id", relatedTaskId).eq("organization_id", gate.profile.organization_id).maybeSingle();
  if (!related) return { success: false, error: "Related task not found" };
  const { data, error } = await supabase
    .from("task_dependencies")
    .upsert({ organization_id: gate.profile.organization_id, task_id: id, related_task_id: relatedTaskId, relation, created_by: gate.profile.id }, { onConflict: "task_id,related_task_id,relation" })
    .select("*, related_task:tasks!task_dependencies_related_task_id_fkey(id, title, status)")
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath(`/tasks/${id}`);
  return { success: true, data: data as TaskDependency };
}

export async function addTaskResource(
  id: string,
  input: { label: string; url: string; kind: "link" | "github" | "document" | "design" | "file" }
): Promise<ActionResult<TaskResource>> {
  const gate = await getTaskMutationContext(id);
  if ("error" in gate) return { success: false, error: gate.error };
  const label = input.label.trim();
  const url = input.url.trim();
  if (!label || !url) return { success: false, error: "Label and URL are required" };
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("invalid");
  } catch {
    return { success: false, error: "Use a valid http(s) URL" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_resources")
    .insert({ organization_id: gate.profile.organization_id, task_id: id, label, url, kind: input.kind, created_by: gate.profile.id })
    .select("*")
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath(`/tasks/${id}`);
  return { success: true, data: data as TaskResource };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) {
    return { success: false, error: "Not authenticated" };
  }

  const existing = await fetchTaskForAccess(id);
  if (!existing || existing.organization_id !== profile.organization_id) {
    return { success: false, error: "Task not found" };
  }

  if (!canDeleteTaskForProfile(profile, existing)) {
    return { success: false, error: "You don't have permission to delete tasks" };
  }

  // App-layer authz already enforced above. Use service role so delete is not
  // silently blocked by older RLS (managers-only) that lagged developpeur rules.
  const admin = createAdminClient();
  const { data: deleted, error } = await admin
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!deleted?.length) {
    return { success: false, error: "Task not found" };
  }

  await logActivity(
    profile.organization_id,
    profile.id,
    "task_deleted",
    id,
    `Deleted task "${existing.title}"`
  );

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

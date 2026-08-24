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

  const { data, error } = await supabase
    .from("tasks")
    .update({
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
    })
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
    .update({ status })
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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/auth";
import { canDeleteTask } from "@/lib/permissions";
import { taskSchema } from "@/lib/validations/task";
import type {
  ActionResult,
  ActivityType,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/types/database";

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

export async function getTasks(filters?: {
  status?: string;
  due_date?: string;
}): Promise<Task[]> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return [];

  let query = supabase
    .from("tasks")
    .select(
      "*, assigned_profile:profiles!tasks_assigned_to_fkey(*), lead:leads!tasks_lead_id_fkey(*)"
    )
    .eq("organization_id", profile.organization_id)
    .order("due_date", { ascending: true, nullsFirst: false });

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
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(
      "*, assigned_profile:profiles!tasks_assigned_to_fkey(*), lead:leads!tasks_lead_id_fkey(*)"
    )
    .eq("id", id)
    .single();
  return data as Task | null;
}

export async function getTasksForLead(leadId: string): Promise<Task[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("*, assigned_profile:profiles!tasks_assigned_to_fkey(*)")
    .eq("lead_id", leadId)
    .order("due_date", { ascending: true });
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

  const values = parsed.data;
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
      assigned_to: values.assigned_to || null,
      lead_id: values.lead_id || null,
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
  if (values.lead_id) {
    revalidatePath(`/leads/${values.lead_id}`);
    revalidatePath(`/leads/${values.lead_id}`);
  }
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

  const values = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: values.title,
      description: values.description || null,
      status: values.status as TaskStatus,
      priority: values.priority as TaskPriority,
      due_date: values.due_date || null,
      assigned_to: values.assigned_to || null,
      lead_id: values.lead_id || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  const activityType =
    values.status === "done" ? "task_completed" : "task_updated";
  await logActivity(
    profile.organization_id,
    profile.id,
    activityType,
    id,
    values.status === "done"
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
    status === "done" ? "task_completed" : "task_updated",
    id,
    status === "done"
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

  if (!canDeleteTask(profile.role)) {
    return { success: false, error: "You don't have permission to delete tasks" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("tasks")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  if (existing) {
    await logActivity(
      profile.organization_id,
      profile.id,
      "task_deleted",
      id,
      `Deleted task "${existing.title}"`
    );
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true, data: undefined };
}

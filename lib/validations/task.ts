import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().or(z.literal("")),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  due_date: z.string().optional().nullable().or(z.literal("")),
  /** @deprecated use assignee_ids — kept for partial updates */
  assigned_to: z.string().uuid().optional().nullable().or(z.literal("")),
  assignee_ids: z.array(z.string().uuid()),
  lead_id: z.string().uuid().optional().nullable().or(z.literal("")),
  project_id: z.string().uuid().optional().nullable().or(z.literal("")),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

/** Resolve assignee list from form values (supports legacy assigned_to). */
export function normalizeAssigneeIds(values: {
  assignee_ids?: string[] | null;
  assigned_to?: string | null;
}): string[] {
  const fromArray = (values.assignee_ids ?? []).filter(Boolean);
  if (fromArray.length) return [...new Set(fromArray)];
  if (values.assigned_to) return [values.assigned_to];
  return [];
}

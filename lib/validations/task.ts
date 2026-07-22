import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().or(z.literal("")),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  due_date: z.string().optional().nullable().or(z.literal("")),
  assigned_to: z.string().uuid().optional().nullable().or(z.literal("")),
  lead_id: z.string().uuid().optional().nullable().or(z.literal("")),
  project_id: z.string().uuid().optional().nullable().or(z.literal("")),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

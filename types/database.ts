export type Role = "admin" | "manager" | "member";

export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ActivityType =
  | "lead_created"
  | "lead_updated"
  | "lead_stage_changed"
  | "lead_deleted"
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "task_deleted";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  job_title: string | null;
  role: Role;
  organization_id: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  title: string;
  company: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  value: number;
  stage: LeadStage;
  notes: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_profile?: Profile | null;
}

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  lead_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_profile?: Profile | null;
  lead?: Lead | null;
}

export interface Activity {
  id: string;
  organization_id: string;
  type: ActivityType;
  entity_type: "lead" | "task";
  entity_id: string | null;
  message: string;
  user_id: string | null;
  created_at: string;
  profile?: Profile | null;
}

export const LEAD_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const TASK_STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "done",
  "cancelled",
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

export const TASK_PRIORITIES: TaskPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

import type { TaskStatus } from "@/types/database";

/** Display order for list groups (matches ClickUp capture top → bottom). */
export const TASK_STATUS_ORDER: TaskStatus[] = [
  "testing",
  "review",
  "in_progress",
  "todo",
  "backlog",
];

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  testing: "#7c3aed",
  review: "#15803d",
  in_progress: "#0f766e",
  todo: "#2563eb",
  backlog: "#9ca3af",
};

/** Solid pill styles for list/badge (ClickUp-like). */
export const TASK_STATUS_PILL: Record<
  TaskStatus,
  { bg: string; color: string; border?: string }
> = {
  testing: { bg: "#7c3aed", color: "#fff" },
  review: { bg: "#15803d", color: "#fff" },
  in_progress: { bg: "#0f766e", color: "#fff" },
  todo: { bg: "#2563eb", color: "#fff" },
  backlog: {
    bg: "#f3f4f6",
    color: "#4b5563",
    border: "1px solid #d1d5db",
  },
};

/** Last workflow stage — used for “mark done” / completion metrics. */
export const TASK_DONE_STATUS: TaskStatus = "testing";

export function isTaskDoneStatus(status: TaskStatus): boolean {
  return status === TASK_DONE_STATUS;
}

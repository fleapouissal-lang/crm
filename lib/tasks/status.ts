import type { TaskStatus } from "@/types/database";

/** Default display order: À planifier → … → Terminé */
export const TASK_STATUS_ORDER: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "testing",
];

const STATUS_SET = new Set<string>(TASK_STATUS_ORDER);

/** Keep a custom list valid (all statuses, no dupes). */
export function normalizeTaskStatusOrder(order: unknown): TaskStatus[] {
  if (!Array.isArray(order)) return [...TASK_STATUS_ORDER];
  const seen = new Set<TaskStatus>();
  const next: TaskStatus[] = [];
  for (const item of order) {
    if (typeof item !== "string" || !STATUS_SET.has(item) || seen.has(item as TaskStatus)) {
      continue;
    }
    const status = item as TaskStatus;
    seen.add(status);
    next.push(status);
  }
  for (const status of TASK_STATUS_ORDER) {
    if (!seen.has(status)) next.push(status);
  }
  return next;
}

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

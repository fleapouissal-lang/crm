import type { Activity, ActivityType } from "@/types/database";

export type NotifKind = "lead" | "task";

export function activityKind(type: ActivityType): NotifKind {
  return type.startsWith("task_") ? "task" : "lead";
}

export function activityHref(activity: Activity): string | null {
  if (!activity.entity_id) return null;
  if (activity.entity_type === "task") return `/tasks/${activity.entity_id}`;
  if (activity.entity_type === "lead") return `/leads/${activity.entity_id}`;
  return null;
}

export function activityAccent(kind: NotifKind): string {
  return kind === "task" ? "var(--grad-brand)" : "var(--grad-fusion)";
}

export function initialsFromName(name: string | null | undefined, fallback = "?"): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

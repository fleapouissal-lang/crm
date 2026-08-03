import type { Task } from "@/types/database";

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isIsoDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function taskMatchesDueFilter(
  task: Pick<Task, "due_date">,
  dueFilter: string,
  today = todayKey()
): boolean {
  const day =
    !dueFilter || dueFilter === "today"
      ? today
      : isIsoDateKey(dueFilter)
        ? dueFilter
        : today;
  return task.due_date === day;
}

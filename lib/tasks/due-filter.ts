import type { Task, TaskStatus } from "@/types/database";
import { isTaskDoneStatus } from "@/lib/tasks/status";

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isIsoDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Task still in progress — rolls forward as a daily reminder. */
export function isOpenReminderTask(task: Pick<Task, "status">) {
  return !isTaskDoneStatus(task.status as TaskStatus);
}

/**
 * - `all` / empty → every task
 * - ISO date → due that day, plus unfinished open tasks (reminders)
 */
export function taskMatchesDueFilter(
  task: Pick<Task, "due_date" | "status">,
  dueFilter: string,
  today = todayKey()
): boolean {
  if (!dueFilter || dueFilter === "all") return true;

  const day =
    dueFilter === "today"
      ? today
      : isIsoDateKey(dueFilter)
        ? dueFilter
        : today;

  if (task.due_date === day) return true;

  // Unfinished work stays visible every day as a reminder
  if (!isOpenReminderTask(task)) return false;

  // No due date → always remind on the selected day
  if (!task.due_date) return true;

  // Past-due or due earlier → keep showing until finished
  return task.due_date <= day;
}

/** Tasks to show in a day's panel (exact due + open reminders). */
export function tasksVisibleOnDay(
  tasks: Task[],
  day: string,
  today = todayKey()
): Task[] {
  return tasks.filter((t) => taskMatchesDueFilter(t, day, today));
}

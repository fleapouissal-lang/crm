/** Resolve assignee ids from a task row (array or legacy assigned_to). */

export function getTaskAssigneeIds(task: {
  assignee_ids?: string[] | null;
  assigned_to?: string | null;
}): string[] {
  const fromArray = (task.assignee_ids ?? []).filter(Boolean);
  if (fromArray.length) return [...new Set(fromArray)];
  if (task.assigned_to) return [task.assigned_to];
  return [];
}

export function taskMatchesAssigneeFilter(
  task: {
    assignee_ids?: string[] | null;
    assigned_to?: string | null;
  },
  filter: string
): boolean {
  if (filter === "all") return true;
  const ids = getTaskAssigneeIds(task);
  if (filter === "unassigned") return ids.length === 0;
  return ids.includes(filter);
}

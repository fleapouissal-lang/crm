/** Helpers for filtering tasks by project (project_id lives on tasks in DB). */

export function taskMatchesProjectFilter(
  task: { project_id?: string | null },
  filter: string
): boolean {
  if (filter === "all") return true;
  const linked = task.project_id ?? null;
  if (filter === "none") return !linked;
  return linked === filter;
}

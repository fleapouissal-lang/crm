const STORAGE_KEY = "fusion-task-projects-v1";

export type TaskProjectLinks = Record<string, string>;

export function loadTaskProjectLinks(): TaskProjectLinks {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TaskProjectLinks;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveTaskProjectLinks(links: TaskProjectLinks): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

export function getTaskProjectId(
  taskId: string,
  links?: TaskProjectLinks
): string | null {
  const map = links ?? loadTaskProjectLinks();
  return map[taskId] ?? null;
}

export function setTaskProjectId(taskId: string, projectId: string | null): void {
  const links = loadTaskProjectLinks();
  if (!projectId) {
    delete links[taskId];
  } else {
    links[taskId] = projectId;
  }
  saveTaskProjectLinks(links);
}

export function taskMatchesProjectFilter(
  taskId: string,
  filter: string,
  links: TaskProjectLinks
): boolean {
  if (filter === "all") return true;
  const linked = links[taskId] ?? null;
  if (filter === "none") return !linked;
  return linked === filter;
}

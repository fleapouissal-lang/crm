import type { TeamMemberOption } from "@/lib/team/members";
import { normalizeProject, type ProjectRecord } from "./types";
import { PROJECT_SEED } from "./seed";

const STORAGE_KEY = "fusion-projects-v2";

function normalizeAll(
  projects: ProjectRecord[],
  teamOptions: TeamMemberOption[]
): ProjectRecord[] {
  return projects.map((p) => normalizeProject(p, teamOptions));
}

export function loadProjects(teamOptions: TeamMemberOption[]): ProjectRecord[] {
  const seed = normalizeAll(PROJECT_SEED, teamOptions);

  if (typeof window === "undefined") return seed;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem("fusion-projects-v1");
      if (legacy) {
        const parsed = JSON.parse(legacy) as ProjectRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated = normalizeAll(parsed, teamOptions);
          saveProjects(migrated);
          return migrated;
        }
      }
      return seed;
    }
    const parsed = JSON.parse(raw) as ProjectRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seed;
    return normalizeAll(parsed, teamOptions);
  } catch {
    return seed;
  }
}

export function saveProjects(projects: ProjectRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

import type { TeamMemberOption } from "@/lib/team/members";
import { normalizeProject, type ProjectRecord } from "./types";

/** Bumped to drop demo projects previously auto-seeded. */
const STORAGE_KEY = "fusion-projects-v3";

function normalizeAll(
  projects: ProjectRecord[],
  teamOptions: TeamMemberOption[]
): ProjectRecord[] {
  return projects.map((p) => normalizeProject(p, teamOptions));
}

export function loadProjects(teamOptions: TeamMemberOption[]): ProjectRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProjectRecord[];
    if (!Array.isArray(parsed)) return [];
    return normalizeAll(parsed, teamOptions);
  } catch {
    return [];
  }
}

export function saveProjects(projects: ProjectRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

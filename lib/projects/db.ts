import type { ProjectRecord } from "@/lib/projects/types";

export type ProjectRow = {
  id: string;
  organization_id: string;
  initials: string;
  gradient: string;
  title: string;
  subtitle: string;
  progress: number;
  badge_class: string;
  status_key: string;
  team_member_ids: string[] | null;
  chip_key: string;
  chip_rose: boolean;
  phase: string;
  created_at?: string;
  updated_at?: string;
};

export function rowToProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    initials: row.initials ?? "",
    gradient: row.gradient ?? "",
    title: row.title,
    subtitle: row.subtitle ?? "",
    progress: Number(row.progress) || 0,
    badgeClass: row.badge_class ?? "b-blue",
    statusKey: row.status_key as ProjectRecord["statusKey"],
    teamMemberIds: row.team_member_ids ?? [],
    chipKey: row.chip_key as ProjectRecord["chipKey"],
    chipRose: !!row.chip_rose,
    phase: row.phase as ProjectRecord["phase"],
  };
}

export function projectToRow(
  project: ProjectRecord,
  organizationId: string
): Omit<ProjectRow, "created_at" | "updated_at"> {
  const teamMemberIds = (project.teamMemberIds ?? []).filter((id) =>
    /^[0-9a-f-]{36}$/i.test(id)
  );
  return {
    id: project.id,
    organization_id: organizationId,
    initials: project.initials,
    gradient: project.gradient,
    title: project.title,
    subtitle: project.subtitle,
    progress: project.progress,
    badge_class: project.badgeClass,
    status_key: project.statusKey,
    team_member_ids: teamMemberIds,
    chip_key: project.chipKey,
    chip_rose: !!project.chipRose,
    phase: project.phase,
  };
}

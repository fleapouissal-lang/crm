import type { FusionDictionary } from "@/lib/i18n/dictionaries/fusion/en";
import type { TeamMemberOption } from "@/lib/team/members";
import {
  DEMO_TEAM_MEMBERS,
  matchMemberByInitials,
  resolveLegacyTeamTokens,
} from "@/lib/team/members";

export type ProjectPhase = "inProgress" | "review" | "delivered";
export type ProjectStatusKey = keyof FusionDictionary["badges"];
export type ProjectTab = "all" | ProjectPhase;

export interface ProjectRecord {
  id: string;
  initials: string;
  gradient: string;
  title: string;
  subtitle: string;
  progress: number;
  badgeClass: string;
  statusKey: ProjectStatusKey;
  /** Profile IDs or demo team member IDs */
  teamMemberIds: string[];
  /** @deprecated migrated to teamMemberIds */
  team?: string[];
  chipKey: ProjectStatusKey;
  chipRose?: boolean;
  phase: ProjectPhase;
}

export const PROJECT_STATUS_FILTERS: ProjectStatusKey[] = [
  "onTrack",
  "live",
  "bidStage",
  "review",
  "delivered",
];

export const PROJECT_FORM_STATUSES: ProjectStatusKey[] = [
  "onTrack",
  "live",
  "bidStage",
  "review",
  "delivered",
];

export const PROJECT_CHIP_KEYS: ProjectStatusKey[] = [
  "dueAug22",
  "dueJul10",
  "product",
  "maintenance",
  "review",
  "delivered",
  "onTrack",
  "live",
];

export const STATUS_BADGE_CLASS: Partial<Record<ProjectStatusKey, string>> = {
  onTrack: "b-green",
  live: "b-blue",
  bidStage: "b-amber",
  review: "b-gold",
  delivered: "b-blue",
};

const GRADIENTS = [
  "linear-gradient(135deg,#52525b,#71717a)",
  "linear-gradient(135deg,#3ecf8e,#2fa876)",
  "linear-gradient(135deg,#e6b567,#d99a4e)",
  "linear-gradient(135deg,#71717a,#3f3f46)",
  "linear-gradient(135deg,#f2557a,#d63e63)",
  "linear-gradient(135deg,#52525b,#4169d6)",
];

export function badgeClassForStatus(key: ProjectStatusKey): string {
  return STATUS_BADGE_CLASS[key] ?? "b-blue";
}

export function initialsFromTitle(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0];
  if (first.length <= 2 && /[^\x00-\x7F]/.test(first)) return first.slice(0, 2);
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function gradientForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[hash]!;
}

export function matchesProjectTab(project: ProjectRecord, tab: ProjectTab): boolean {
  if (tab === "all") return true;
  return project.phase === tab;
}

export function normalizeProject(
  raw: ProjectRecord,
  teamOptions: TeamMemberOption[]
): ProjectRecord {
  let teamMemberIds = raw.teamMemberIds ?? [];

  if (teamMemberIds.length === 0 && raw.team?.length) {
    teamMemberIds = resolveLegacyTeamTokens(raw.team, teamOptions);
  }

  // Re-map stored IDs to current profile IDs when initials match (DB vs demo)
  teamMemberIds = teamMemberIds.map((id) => {
    const exact = teamOptions.find((m) => m.id === id);
    if (exact) return exact.id;

    const demo = DEMO_TEAM_MEMBERS.find((m) => m.id === id);
    if (demo) {
      const fromProfile = teamOptions.find((m) => m.initials === demo.initials);
      if (fromProfile) return fromProfile.id;
      return demo.id;
    }

    const legacy = matchMemberByInitials(id, teamOptions);
    return legacy?.id ?? id;
  });

  const { team: _legacy, ...rest } = raw;
  return { ...rest, teamMemberIds: [...new Set(teamMemberIds)] };
}

export function projectMatchesMember(
  project: ProjectRecord,
  memberId: string
): boolean {
  return project.teamMemberIds.includes(memberId);
}

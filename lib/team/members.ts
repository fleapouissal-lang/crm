import type { Profile } from "@/types/database";

export interface TeamMemberOption {
  id: string;
  initials: string;
  name: string;
  role?: string;
  color: string;
  email?: string;
  phone?: string;
}

const AVATAR_COLORS = ["#52525b", "#3ecf8e", "#f5a623", "#71717a", "#4169d6", "#d63e63"];

/** Demo roster when org profiles are unavailable (matches Fusion Leap HR). */
export const DEMO_TEAM_MEMBERS: TeamMemberOption[] = [
  {
    id: "tm-yk",
    initials: "YK",
    name: "Youssef Kaab",
    role: "Founder & MD",
    color: "#52525b",
    email: "youssef@fusionleap.ma",
    phone: "+212 6 00 00 00 01",
  },
  {
    id: "tm-ob",
    initials: "OB",
    name: "Ouissal BenZahi",
    role: "Developer",
    color: "#3ecf8e",
    email: "ouissal@fusionleap.ma",
    phone: "+212 6 00 00 00 02",
  },
  {
    id: "tm-ac",
    initials: "AC",
    name: "Achraf",
    role: "Design Lead",
    color: "#f5a623",
    email: "achraf@fusionleap.ma",
    phone: "+212 6 00 00 00 03",
  },
  {
    id: "tm-dl",
    initials: "DL",
    name: "Dalal",
    role: "Commercial / Sales",
    color: "#71717a",
    email: "dalal@fusionleap.ma",
    phone: "+212 6 00 00 00 04",
  },
];

export function initialsFromName(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0];
  if (parts.length === 1) {
    if (first.length <= 2 && /[^\x00-\x7F]/.test(first)) return first.slice(0, 2);
    return first.slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorForMemberId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash]!;
}

export function profileToTeamOption(profile: Profile): TeamMemberOption {
  return {
    id: profile.id,
    initials: initialsFromName(profile.full_name ?? profile.email),
    name: profile.full_name ?? profile.email ?? "User",
    role: profile.role,
    color: colorForMemberId(profile.id),
    email: profile.email ?? undefined,
    phone: profile.phone ?? undefined,
  };
}

export function buildTeamOptions(profiles: Profile[]): TeamMemberOption[] {
  if (profiles.length > 0) {
    return profiles.map(profileToTeamOption);
  }
  return DEMO_TEAM_MEMBERS;
}

export function getTeamMembers(
  ids: string[],
  options: TeamMemberOption[]
): TeamMemberOption[] {
  const map = new Map(options.map((m) => [m.id, m]));
  return ids.map((id) => map.get(id)).filter((m): m is TeamMemberOption => !!m);
}

export function matchMemberByInitials(
  token: string,
  options: TeamMemberOption[]
): TeamMemberOption | undefined {
  const t = token.trim().toUpperCase();
  return options.find((m) => m.initials.toUpperCase() === t);
}

export function resolveLegacyTeamTokens(
  tokens: string[],
  options: TeamMemberOption[]
): string[] {
  const ids = new Set<string>();
  for (const token of tokens) {
    const byInitials = matchMemberByInitials(token, options);
    if (byInitials) ids.add(byInitials.id);
  }
  return [...ids];
}

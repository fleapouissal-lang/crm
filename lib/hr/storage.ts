import type { TeamMemberOption } from "@/lib/team/members";
import type { EmployeeProfile, HrContractScan, HrEntry } from "./types";
import { normalizeEmployeeProfile } from "./types";
import { HR_SEED } from "./seed";

const STORAGE_KEY = "fusion-hr-v1";

function defaultProfile(member: TeamMemberOption): EmployeeProfile {
  return {
    memberId: member.id,
    roleTitle: member.role ?? member.name,
    department: "tech",
    contractType: "core",
    utilization: 75,
    status: "active",
    contractStart: "",
    contractEnd: "",
    contractScans: [],
    entries: [],
  };
}

function normalizeAll(profiles: EmployeeProfile[]): EmployeeProfile[] {
  return profiles.map(normalizeEmployeeProfile);
}

function mergeWithTeam(
  stored: EmployeeProfile[],
  teamOptions: TeamMemberOption[]
): EmployeeProfile[] {
  const byId = new Map(stored.map((p) => [p.memberId, p]));
  const seedById = new Map(HR_SEED.map((p) => [p.memberId, p]));

  return teamOptions.map((member) => {
    const existing = byId.get(member.id);
    const seed = seedById.get(member.id);
    if (existing) {
      return normalizeEmployeeProfile({
        ...existing,
        entries: existing.entries.length > 0 ? existing.entries : (seed?.entries ?? []),
        contractScans:
          (existing.contractScans?.length ?? 0) > 0
            ? existing.contractScans!
            : (seed?.contractScans ?? []),
        contractStart: existing.contractStart || seed?.contractStart || "",
        contractEnd: existing.contractEnd || seed?.contractEnd || "",
      });
    }
    if (seed) return normalizeEmployeeProfile({ ...seed });
    return defaultProfile(member);
  });
}

export function loadHrProfiles(teamOptions: TeamMemberOption[]): EmployeeProfile[] {
  const fallback = normalizeAll(mergeWithTeam(HR_SEED, teamOptions));

  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as EmployeeProfile[];
    if (!Array.isArray(parsed)) return fallback;
    return normalizeAll(mergeWithTeam(parsed, teamOptions));
  } catch {
    return fallback;
  }
}

export function saveHrProfiles(profiles: EmployeeProfile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function upsertHrEntry(
  profiles: EmployeeProfile[],
  entry: HrEntry
): EmployeeProfile[] {
  return profiles.map((p) =>
    p.memberId === entry.memberId
      ? { ...p, entries: [entry, ...p.entries] }
      : p
  );
}

export function updateEmployeeProfile(
  profiles: EmployeeProfile[],
  profile: EmployeeProfile
): EmployeeProfile[] {
  return profiles.map((p) =>
    p.memberId === profile.memberId ? normalizeEmployeeProfile(profile) : p
  );
}

export function addContractScan(
  profiles: EmployeeProfile[],
  scan: HrContractScan
): EmployeeProfile[] {
  return profiles.map((p) =>
    p.memberId === scan.memberId
      ? normalizeEmployeeProfile({
          ...p,
          contractScans: [scan, ...(p.contractScans ?? [])],
        })
      : p
  );
}

export function removeContractScan(
  profiles: EmployeeProfile[],
  memberId: string,
  scanId: string
): EmployeeProfile[] {
  return profiles.map((p) =>
    p.memberId === memberId
      ? normalizeEmployeeProfile({
          ...p,
          contractScans: (p.contractScans ?? []).filter((s) => s.id !== scanId),
        })
      : p
  );
}

import type { TeamMemberOption } from "@/lib/team/members";
import type { EmployeeProfile } from "./types";
import { emptyProfileForMember } from "./map-rows";

/** Legacy client key — cleared on load/logout; never used for payroll secrets. */
export const HR_LEGACY_STORAGE_KEY = "fusion-hr-v1";

export function clearHrLocalCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HR_LEGACY_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Shells only — no salaries/entries. Server is source of truth. */
export function buildEmptyHrProfiles(
  teamOptions: TeamMemberOption[]
): EmployeeProfile[] {
  return teamOptions.map(emptyProfileForMember);
}

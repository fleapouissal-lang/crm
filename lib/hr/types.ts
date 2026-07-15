export type HrEntryType =
  | "bonus"
  | "commission"
  | "overtime"
  | "lateness"
  | "leave"
  | "note";

export type HrContractType =
  | "founder"
  | "core"
  | "cdd"
  | "cdi"
  | "stage"
  | "commission";

export type HrMemberStatus = "active" | "onLeave" | "inactive";

export type HrDepartment = "management" | "tech" | "design" | "commercial";

export interface HrEntry {
  id: string;
  memberId: string;
  type: HrEntryType;
  date: string;
  amount?: number;
  currency?: string;
  hours?: number;
  /** Minutes late (lateness entries). */
  minutes?: number;
  days?: number;
  /** End date for leave entries (inclusive range with date). */
  endDate?: string;
  note?: string;
  createdAt: string;
}

export interface HrContractScan {
  id: string;
  memberId: string;
  fileName: string;
  mimeType: string;
  /** Signed URL for viewing (server-issued, short-lived). */
  dataUrl: string;
  /** Private storage object path (org-scoped). */
  storagePath?: string;
  uploadedAt: string;
  label?: string;
}

export interface EmployeeProfile {
  memberId: string;
  roleTitle: string;
  department: HrDepartment;
  /** Business unit (BU) within the company. */
  businessUnit?: string;
  phone?: string;
  email?: string;
  /** Monthly base salary. */
  baseSalary?: number;
  salaryCurrency?: string;
  /** Hourly rate used to value overtime in the salary account (optional). */
  overtimeRate?: number;
  contractType: HrContractType;
  utilization: number;
  status: HrMemberStatus;
  contractStart?: string;
  contractEnd?: string;
  contractScans?: HrContractScan[];
  entries: HrEntry[];
}

export type HrProfileTab =
  | "overview"
  | "bonus"
  | "commission"
  | "overtime"
  | "lateness"
  | "leave"
  | "note"
  | "contract";

export const HR_PROFILE_TABS: HrProfileTab[] = [
  "overview",
  "bonus",
  "commission",
  "overtime",
  "lateness",
  "leave",
  "note",
  "contract",
];

export const HR_ENTRY_TYPES: HrEntryType[] = [
  "bonus",
  "commission",
  "overtime",
  "lateness",
  "leave",
  "note",
];

export const HR_CONTRACT_TYPES: HrContractType[] = [
  "founder",
  "core",
  "cdd",
  "cdi",
  "stage",
  "commission",
];

export const HR_DEPARTMENTS: HrDepartment[] = [
  "management",
  "tech",
  "design",
  "commercial",
];

export const HR_MEMBER_STATUSES: HrMemberStatus[] = [
  "active",
  "onLeave",
  "inactive",
];

export function entryTypeBadgeClass(type: HrEntryType): string {
  switch (type) {
    case "bonus":
      return "b-green";
    case "commission":
      return "b-iris";
    case "overtime":
      return "b-gold";
    case "lateness":
      return "b-rose";
    case "leave":
      return "b-blue";
    default:
      return "b-gray";
  }
}

export function memberStatusBadgeClass(status: HrMemberStatus): string {
  switch (status) {
    case "active":
      return "b-green";
    case "onLeave":
      return "b-gold";
    default:
      return "b-gray";
  }
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function sumEntries(
  entries: HrEntry[],
  type: HrEntryType,
  opts?: { month?: string }
): number {
  return entries
    .filter((e) => {
      if (e.type !== type) return false;
      if (opts?.month && monthKey(e.date) !== opts.month) return false;
      return true;
    })
    .reduce((acc, e) => {
      if (type === "overtime") return acc + (e.hours ?? 0);
      if (type === "leave") return acc + (e.days ?? 0);
      if (type === "lateness") return acc + 1;
      if (type === "bonus" || type === "commission") return acc + (e.amount ?? 0);
      return acc;
    }, 0);
}

export function avgUtilization(profiles: EmployeeProfile[]): number {
  if (profiles.length === 0) return 0;
  const total = profiles.reduce((s, p) => s + p.utilization, 0);
  return Math.round(total / profiles.length);
}

export function normalizeEmployeeProfile(profile: EmployeeProfile): EmployeeProfile {
  const salary =
    typeof profile.baseSalary === "number" && Number.isFinite(profile.baseSalary)
      ? Math.max(0, profile.baseSalary)
      : undefined;
  const overtimeRate =
    typeof profile.overtimeRate === "number" && Number.isFinite(profile.overtimeRate)
      ? Math.max(0, profile.overtimeRate)
      : undefined;

  return {
    ...profile,
    businessUnit: profile.businessUnit?.trim() || "",
    phone: profile.phone?.trim() || "",
    email: profile.email?.trim() || "",
    baseSalary: salary,
    overtimeRate,
    salaryCurrency: profile.salaryCurrency?.trim() || "MAD",
    contractStart: profile.contractStart ?? "",
    contractEnd: profile.contractEnd ?? "",
    contractScans: profile.contractScans ?? [],
    entries: profile.entries ?? [],
  };
}

export function formatBaseSalary(
  profile: Pick<EmployeeProfile, "baseSalary" | "salaryCurrency">,
  emptyLabel = "—"
): string {
  if (profile.baseSalary == null || profile.baseSalary <= 0) return emptyLabel;
  const currency = profile.salaryCurrency || "MAD";
  return `${profile.baseSalary.toLocaleString()} ${currency}`;
}

export function filterEntriesByType(
  entries: HrEntry[],
  type: HrEntryType | "note"
): HrEntry[] {
  return entries
    .filter((e) => e.type === type)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
    );
}

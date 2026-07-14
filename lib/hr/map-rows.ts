import type {
  EmployeeProfile,
  HrContractScan,
  HrContractType,
  HrDepartment,
  HrEntry,
  HrEntryType,
  HrMemberStatus,
} from "./types";
import { normalizeEmployeeProfile } from "./types";
import type { TeamMemberOption } from "@/lib/team/members";

export type HrProfileRow = {
  id: string;
  organization_id: string;
  member_id: string;
  role_title: string;
  department: string;
  business_unit: string;
  phone: string;
  email: string;
  base_salary: number | string | null;
  salary_currency: string;
  overtime_rate: number | string | null;
  contract_type: string;
  utilization: number;
  status: string;
  contract_start: string | null;
  contract_end: string | null;
};

export type HrEntryRow = {
  id: string;
  member_id: string;
  type: string;
  entry_date: string;
  amount: number | string | null;
  currency: string | null;
  hours: number | string | null;
  minutes: number | null;
  days: number | string | null;
  note: string | null;
  created_at: string;
};

export type HrScanRow = {
  id: string;
  member_id: string;
  file_name: string;
  mime_type: string;
  storage_path: string;
  label: string | null;
  uploaded_at: string;
};

function num(v: number | string | null | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function mapEntryRow(row: HrEntryRow): HrEntry {
  return {
    id: row.id,
    memberId: row.member_id,
    type: row.type as HrEntryType,
    date: row.entry_date,
    amount: num(row.amount),
    currency: row.currency ?? "MAD",
    hours: num(row.hours),
    minutes: row.minutes ?? undefined,
    days: num(row.days),
    note: row.note ?? "",
    createdAt: row.created_at,
  };
}

export function mapScanRow(
  row: HrScanRow,
  signedUrl: string
): HrContractScan {
  return {
    id: row.id,
    memberId: row.member_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    dataUrl: signedUrl,
    storagePath: row.storage_path,
    uploadedAt: row.uploaded_at,
    label: row.label ?? undefined,
  };
}

export function emptyProfileForMember(member: TeamMemberOption): EmployeeProfile {
  return normalizeEmployeeProfile({
    memberId: member.id,
    roleTitle: member.role ?? member.name,
    department: "tech",
    businessUnit: "",
    phone: member.phone ?? "",
    email: member.email ?? "",
    baseSalary: undefined,
    salaryCurrency: "MAD",
    overtimeRate: undefined,
    contractType: "core",
    utilization: 75,
    status: "active",
    contractStart: "",
    contractEnd: "",
    contractScans: [],
    entries: [],
  });
}

export function mergeHrWorkspace(
  team: TeamMemberOption[],
  profileRows: HrProfileRow[],
  entryRows: HrEntryRow[],
  scanRows: HrScanRow[],
  signedByPath: Map<string, string>
): EmployeeProfile[] {
  const profilesByMember = new Map(profileRows.map((r) => [r.member_id, r]));
  const entriesByMember = new Map<string, HrEntry[]>();
  for (const row of entryRows) {
    const list = entriesByMember.get(row.member_id) ?? [];
    list.push(mapEntryRow(row));
    entriesByMember.set(row.member_id, list);
  }
  const scansByMember = new Map<string, HrContractScan[]>();
  for (const row of scanRows) {
    const url = signedByPath.get(row.storage_path) ?? "";
    const list = scansByMember.get(row.member_id) ?? [];
    list.push(mapScanRow(row, url));
    scansByMember.set(row.member_id, list);
  }

  return team.map((member) => {
    const row = profilesByMember.get(member.id);
    if (!row) {
      return emptyProfileForMember(member);
    }
    return normalizeEmployeeProfile({
      memberId: member.id,
      roleTitle: row.role_title || member.role || member.name,
      department: (row.department || "tech") as HrDepartment,
      businessUnit: row.business_unit || "",
      phone: row.phone || member.phone || "",
      email: row.email || member.email || "",
      baseSalary: num(row.base_salary),
      salaryCurrency: row.salary_currency || "MAD",
      overtimeRate: num(row.overtime_rate),
      contractType: (row.contract_type || "core") as HrContractType,
      utilization: row.utilization ?? 75,
      status: (row.status || "active") as HrMemberStatus,
      contractStart: row.contract_start ?? "",
      contractEnd: row.contract_end ?? "",
      contractScans: scansByMember.get(member.id) ?? [],
      entries: entriesByMember.get(member.id) ?? [],
    });
  });
}

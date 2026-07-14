import type { EmployeeProfile, HrEntry } from "./types";
import { formatBaseSalary, sumEntries } from "./types";

export type PayrollMonthSummary = {
  month: string;
  currency: string;
  baseSalary: number;
  bonuses: number;
  commissions: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimeValue: number;
  latenessCount: number;
  leaveDays: number;
  /** base + bonuses + commissions + valued overtime */
  estimatedGross: number;
  hasBaseSalary: boolean;
};

function currentMonthKey(from = new Date()): string {
  return from.toISOString().slice(0, 7);
}

export function computePayrollMonth(
  profile: EmployeeProfile,
  month: string = currentMonthKey()
): PayrollMonthSummary {
  const currency = profile.salaryCurrency || "MAD";
  const baseSalary =
    profile.baseSalary != null && profile.baseSalary > 0 ? profile.baseSalary : 0;
  const bonuses = sumEntries(profile.entries, "bonus", { month });
  const commissions = sumEntries(profile.entries, "commission", { month });
  const overtimeHours = sumEntries(profile.entries, "overtime", { month });
  const latenessCount = sumEntries(profile.entries, "lateness", { month });
  const leaveDays = sumEntries(profile.entries, "leave", { month });
  const overtimeRate = profile.overtimeRate ?? 0;
  const overtimeValue = overtimeRate > 0 ? overtimeHours * overtimeRate : 0;

  return {
    month,
    currency,
    baseSalary,
    bonuses,
    commissions,
    overtimeHours,
    overtimeRate,
    overtimeValue,
    latenessCount,
    leaveDays,
    estimatedGross: baseSalary + bonuses + commissions + overtimeValue,
    hasBaseSalary: baseSalary > 0,
  };
}

export function formatPayrollAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

/** Shift YYYY-MM by ±N months. */
export function shiftMonthKey(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y!, (m! - 1) + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function teamPayrollTotals(
  profiles: EmployeeProfile[],
  month: string = currentMonthKey()
) {
  let baseMass = 0;
  let estimatedMass = 0;
  let overtimeHours = 0;
  let lateness = 0;
  let withSalary = 0;

  for (const p of profiles) {
    const row = computePayrollMonth(p, month);
    baseMass += row.baseSalary;
    estimatedMass += row.estimatedGross;
    overtimeHours += row.overtimeHours;
    lateness += row.latenessCount;
    if (row.hasBaseSalary) withSalary += 1;
  }

  return { baseMass, estimatedMass, overtimeHours, lateness, withSalary, month };
}

export function salaryAccountEntries(
  entries: HrEntry[],
  month?: string
): HrEntry[] {
  const types = new Set(["bonus", "commission", "overtime", "lateness", "leave"]);
  return entries
    .filter((e) => {
      if (!types.has(e.type)) return false;
      if (month && e.date.slice(0, 7) !== month) return false;
      return true;
    })
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
    );
}

export { formatBaseSalary, currentMonthKey };

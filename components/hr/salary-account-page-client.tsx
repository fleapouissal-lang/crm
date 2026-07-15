"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Profile } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
import { CellMain, FlChip, StatLine } from "@/components/fusion/primitives";
import {
  EmployeeProfileFormDialog,
  HrEntryFormDialog,
} from "@/components/hr/hr-form-dialogs";
import { ContractScanPanel } from "@/components/hr/contract-scan-panel";
import { HrEmptyMotif } from "@/components/hr/hr-empty-motif";
import type { EmployeeProfile, HrEntry, HrEntryType } from "@/lib/hr/types";
import {
  entryTypeBadgeClass,
  formatBaseSalary,
  memberStatusBadgeClass,
} from "@/lib/hr/types";
import {
  computePayrollMonth,
  currentMonthKey,
  formatPayrollAmount,
  salaryAccountEntries,
  shiftMonthKey,
} from "@/lib/hr/payroll";
import { formatHrEntryValue, hrMemberPath } from "@/lib/hr/paths";
import { useHrStore } from "@/lib/hr/use-hr-store";
import { cn } from "@/lib/utils";

export function SalaryAccountPageClient({
  memberId,
  profiles,
  initialHrProfiles,
}: {
  memberId: string;
  profiles: Profile[];
  initialHrProfiles: EmployeeProfile[];
}) {
  const dict = useDict();
  const h = dict.fusion.hr;
  const l = dict.fusion.labels;
  const b = dict.fusion.badges;

  const {
    hydrated,
    getMember,
    getProfile,
    saveEntry,
    deleteEntry,
    saveProfile,
    uploadScan,
    deleteScan,
  } = useHrStore(profiles, initialHrProfiles);

  const member = getMember(memberId);
  const profile = getProfile(memberId);

  const [month, setMonth] = useState(currentMonthKey);
  const [entryOpen, setEntryOpen] = useState(false);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [entryDefaultType, setEntryDefaultType] = useState<HrEntryType | undefined>();

  const payroll = useMemo(
    () => (profile ? computePayrollMonth(profile, month) : null),
    [profile, month]
  );

  const monthEntries = useMemo(
    () =>
      profile && payroll
        ? salaryAccountEntries(profile.entries, payroll.month)
        : [],
    [profile, payroll]
  );

  const isCurrentMonth = month === currentMonthKey();

  function openEntry(type?: HrEntryType) {
    setEntryDefaultType(type);
    setEntryOpen(true);
  }

  function handleDeleteEntry(entry: HrEntry) {
    deleteEntry(memberId, entry.id);
    toast.success(h.entryDeleted);
  }

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-xl bg-[var(--glass-hi)]" />;
  }

  if (!member || !profile || !payroll) {
    return (
      <div className="fl-card fl-pad mx-auto max-w-lg text-center">
        <p className="text-sm fl-faint">{h.memberNotFound}</p>
        <Link href="/hr" className="fl-btn sm primary mt-4 inline-flex">
          <ArrowLeft className="size-4" strokeWidth={2} />
          {h.backToTeam}
        </Link>
      </div>
    );
  }

  const phone = profile.phone?.trim() || member.phone || "—";
  const email = profile.email?.trim() || member.email || "—";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/hr" className="fl-btn sm ghost -ms-1">
            <ArrowLeft className="size-4" strokeWidth={2} />
            {h.backToTeam}
          </Link>
          <Link href={hrMemberPath(memberId)} className="fl-btn sm ghost">
            {h.viewDossier}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-0.5">
            <button
              type="button"
              className="fl-btn sm ghost"
              title={h.prevMonth}
              aria-label={h.prevMonth}
              onClick={() => setMonth((m) => shiftMonthKey(m, -1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[5.5rem] text-center fl-mono text-[12px] font-semibold">
              {month}
            </span>
            <button
              type="button"
              className="fl-btn sm ghost"
              title={h.nextMonth}
              aria-label={h.nextMonth}
              disabled={isCurrentMonth}
              onClick={() => setMonth((m) => shiftMonthKey(m, 1))}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <button
            type="button"
            className="fl-btn sm"
            onClick={() => setProfileFormOpen(true)}
          >
            <Pencil className="size-3.5" strokeWidth={2} />
            {h.editProfile}
          </button>
          <button
            type="button"
            className="fl-btn sm primary"
            onClick={() => openEntry("bonus")}
          >
            <Plus className="size-3.5" strokeWidth={2} />
            {h.addEntry}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide fl-faint">
          <Wallet className="size-3.5" />
          {h.salaryAccount}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{member.name}</h1>
        <p className="mt-1 text-sm fl-muted">
          {profile.roleTitle} · {h.payrollMonth} {payroll.month}
        </p>
      </div>

      {!payroll.hasBaseSalary ? (
        <div className="rounded-xl border border-[color-mix(in_oklch,var(--gold),transparent_70%)] bg-[color-mix(in_oklch,var(--gold),transparent_92%)] px-4 py-3 text-sm">
          {h.noBaseSalaryHint}
        </div>
      ) : null}

      <div className="grid g-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{h.baseSalary}</div>
          <StatLine
            value={
              payroll.hasBaseSalary
                ? payroll.baseSalary.toLocaleString("fr-FR")
                : "—"
            }
            unit={payroll.hasBaseSalary ? payroll.currency : undefined}
          />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{h.bonus}</div>
          <StatLine
            value={payroll.bonuses.toLocaleString("fr-FR")}
            unit={payroll.currency}
          />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{h.overtimeHours}</div>
          <StatLine value={String(payroll.overtimeHours)} unit="h" />
          {payroll.overtimeValue > 0 ? (
            <div className="k-foot fl-faint mt-2">
              {formatPayrollAmount(payroll.overtimeValue, payroll.currency)}
            </div>
          ) : null}
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{h.estimatedGross}</div>
          <StatLine
            value={payroll.estimatedGross.toLocaleString("fr-FR")}
            unit={payroll.currency}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="fl-card fl-pad space-y-4 fl-hr-member-hero">
          <h3 className="text-sm font-semibold">{h.memberInfo}</h3>
          <CellMain
            initials={member.initials}
            gradient={`linear-gradient(135deg,${member.color},#71717a)`}
            title={member.name}
            sub={profile.roleTitle}
          />
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
              <dt className="fl-muted">{dict.fusion.settings.phone}</dt>
              <dd className="font-medium truncate">{phone}</dd>
            </div>
            <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
              <dt className="fl-muted">{h.email}</dt>
              <dd className="font-medium truncate">{email}</dd>
            </div>
            <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
              <dt className="fl-muted">{h.baseSalary}</dt>
              <dd className="font-medium fl-mono">{formatBaseSalary(profile)}</dd>
            </div>
            <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
              <dt className="fl-muted shrink-0">{h.contractAndStatus}</dt>
              <dd className="flex flex-wrap items-center justify-end gap-2">
                <FlChip>{h.contracts[profile.contractType]}</FlChip>
                <span className={cn("fl-badge", memberStatusBadgeClass(profile.status))}>
                  {profile.status === "active" ? b.active : h.statuses[profile.status]}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="fl-card fl-pad space-y-4">
          <h3 className="text-sm font-semibold">{h.thisMonthBreakdown}</h3>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
              <dt className="fl-muted">{h.commission}</dt>
              <dd className="fl-mono font-medium">
                {formatPayrollAmount(payroll.commissions, payroll.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
              <dt className="fl-muted">{h.overtimeValue}</dt>
              <dd className="fl-mono font-medium">
                {payroll.overtimeRate > 0
                  ? formatPayrollAmount(payroll.overtimeValue, payroll.currency)
                  : `${payroll.overtimeHours}h`}
              </dd>
            </div>
            <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
              <dt className="fl-muted">{h.lateCount}</dt>
              <dd className="fl-mono font-medium">{payroll.latenessCount}</dd>
            </div>
            <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
              <dt className="fl-muted">{h.leaveDays}</dt>
              <dd className="fl-mono font-medium">{payroll.leaveDays}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="fl-btn sm ghost" onClick={() => openEntry("overtime")}>
              {h.quickAddOvertime}
            </button>
            <button type="button" className="fl-btn sm ghost" onClick={() => openEntry("lateness")}>
              {h.quickAddLateness}
            </button>
            <button type="button" className="fl-btn sm ghost" onClick={() => openEntry("bonus")}>
              {h.quickAddBonus}
            </button>
          </div>
        </div>
      </div>

      <div className="fl-card fl-pad">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {h.thisMonthBreakdown} · {month}
          </h3>
          <FileText className="size-4 text-[var(--text-faint)]" />
        </div>
        {monthEntries.length === 0 ? (
          <HrEmptyMotif
            icon={FileText}
            title={h.noEntriesThisMonth}
            description={h.noEntriesThisMonthHint}
            size="lg"
            action={
              <button type="button" className="fl-btn sm primary" onClick={() => openEntry("bonus")}>
                <Plus className="size-3.5" strokeWidth={2} />
                {h.addEntry}
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {monthEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-start gap-3 px-4 py-3"
              >
                <span
                  className={cn(
                    "fl-badge shrink-0 text-[10px]",
                    entryTypeBadgeClass(entry.type)
                  )}
                >
                  {h[entry.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <b>{formatHrEntryValue(entry, h)}</b>
                    <span className="fl-faint fl-tny">
                      {format(new Date(entry.date + "T00:00:00"), "dd MMM yyyy")}
                    </span>
                  </div>
                  {entry.note?.trim() && entry.type !== "note" ? (
                    <p className="mt-1 text-[12px] fl-muted">{entry.note}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="fl-btn sm ghost text-[var(--rose)]"
                  title={h.deleteEntry}
                  aria-label={h.deleteEntry}
                  onClick={() => handleDeleteEntry(entry)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="fl-card overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h3 className="text-sm font-semibold">{l.contract}</h3>
        </div>
        <div className="fl-pad">
          <ContractScanPanel
            profile={profile}
            onUpload={uploadScan}
            onDelete={(scanId) => {
              deleteScan(memberId, scanId);
              toast.success(h.scanDeleted);
            }}
          />
        </div>
      </div>

      <HrEntryFormDialog
        open={entryOpen}
        onOpenChange={setEntryOpen}
        member={member}
        defaultType={entryDefaultType}
        onSave={saveEntry}
      />

      <EmployeeProfileFormDialog
        open={profileFormOpen}
        onOpenChange={setProfileFormOpen}
        profile={profile}
        member={member}
        onSave={saveProfile}
      />
    </div>
  );
}

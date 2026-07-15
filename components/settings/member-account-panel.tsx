"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useDict } from "@/components/shared/i18n-provider";
import { CellMain, FlChip } from "@/components/fusion/primitives";
import { ContractScanPanel } from "@/components/hr/contract-scan-panel";
import type { EmployeeProfile, HrEntry } from "@/lib/hr/types";
import {
  entryTypeBadgeClass,
  filterEntriesByType,
  formatBaseSalary,
  memberStatusBadgeClass,
} from "@/lib/hr/types";
import { formatHrEntryValue } from "@/lib/hr/paths";
import { computePayrollMonth, currentMonthKey } from "@/lib/hr/payroll";
import { profileToTeamOption } from "@/lib/team/members";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils";

type MemberAccountTab = "contract" | "commission" | "bonus" | "lateness";

function AccountEntryList({
  entries,
  emptyLabel,
}: {
  entries: HrEntry[];
  emptyLabel: string;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm fl-faint">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul className="fl-hr-log divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-start gap-3 px-4 py-3.5">
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
            {entry.note?.trim() ? (
              <p className="mt-1 text-[12px] fl-muted">{entry.note}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MemberAccountPanel({
  profile,
  crmProfile,
}: {
  profile: EmployeeProfile;
  crmProfile: Profile;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;
  const s = dict.fusion.settings;
  const b = dict.fusion.badges;
  const month = currentMonthKey();
  const member = profileToTeamOption(crmProfile);

  const [activeTab, setActiveTab] = useState<MemberAccountTab>("contract");

  const payroll = useMemo(
    () => computePayrollMonth(profile, month),
    [profile, month]
  );

  const tabs: { key: MemberAccountTab; label: string; count: number }[] = [
    {
      key: "contract",
      label: h.tabContract,
      count: (profile.contractScans ?? []).length,
    },
    {
      key: "commission",
      label: h.commission,
      count: filterEntriesByType(profile.entries, "commission").length,
    },
    {
      key: "bonus",
      label: h.bonus,
      count: filterEntriesByType(profile.entries, "bonus").length,
    },
    {
      key: "lateness",
      label: h.lateness,
      count: filterEntriesByType(profile.entries, "lateness").length,
    },
  ];

  const kpis = [
    {
      label: h.baseSalary,
      value: formatBaseSalary(profile, "—"),
    },
    {
      label: h.commission,
      value: `${payroll.commissions.toLocaleString()} MAD`,
    },
    {
      label: h.bonus,
      value: `${payroll.bonuses.toLocaleString()} MAD`,
    },
    {
      label: h.lateCount,
      value: String(payroll.latenessCount),
    },
  ];

  return (
    <div className="space-y-[18px]">
      <div className="fl-card fl-pad">
        <h3 className="text-[15px] font-semibold">{s.accountTitle}</h3>
        <p className="mt-1 text-sm fl-faint">{s.accountSub}</p>
        <p className="mt-2 text-xs fl-faint">{s.accountReadOnlyHint}</p>
      </div>

      <div className="fl-card fl-pad fl-hr-member-hero">
        <CellMain
          initials={member.initials}
          gradient={`linear-gradient(135deg,${member.color},#71717a)`}
          title={member.name}
          sub={profile.roleTitle || crmProfile.job_title || undefined}
        />
        <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5 sm:col-span-2">
            <dt className="fl-muted shrink-0">{h.contractAndStatus}</dt>
            <dd className="flex flex-wrap items-center justify-end gap-2">
              <FlChip>{h.contracts[profile.contractType]}</FlChip>
              <span className={cn("fl-badge", memberStatusBadgeClass(profile.status))}>
                {profile.status === "active" ? b.active : h.statuses[profile.status]}
              </span>
            </dd>
          </div>
          {profile.contractStart ? (
            <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
              <dt className="fl-muted">{h.contractStart}</dt>
              <dd className="fl-mono text-[13px]">
                {format(new Date(profile.contractStart + "T00:00:00"), "dd MMM yyyy")}
              </dd>
            </div>
          ) : null}
          {profile.contractEnd ? (
            <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
              <dt className="fl-muted">{h.contractEnd}</dt>
              <dd className="fl-mono text-[13px]">
                {format(new Date(profile.contractEnd + "T00:00:00"), "dd MMM yyyy")}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="fl-card fl-pad fl-hr-kpi rounded-xl border border-[var(--border)]"
          >
            <div className="fl-tny fl-faint">{kpi.label}</div>
            <div className="fl-mono mt-1.5 text-[17px] font-semibold tracking-tight">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="fl-card fl-hr-profile-card w-full overflow-hidden">
        <div
          className="flex w-full items-stretch gap-0 overflow-x-auto border-b border-[var(--border)] bg-[color-mix(in_oklch,var(--glass-hi),transparent_40%)] px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={cn(
                  "mx-0.5 inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-t-lg border-0 border-b-2 px-3.5 py-3 text-[13px] font-medium transition-colors sm:px-4",
                  isActive
                    ? "border-[var(--iris-2)] bg-[var(--glass-solid)] font-semibold text-[var(--text)]"
                    : "border-transparent text-[var(--text-dim)] hover:text-[var(--text)]"
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                {tab.count > 0 ? (
                  <span className="fl-hr-tab__count inline-flex min-w-[1.25rem] items-center justify-center rounded-full border px-1.5 py-px font-mono text-[10.5px] font-semibold">
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="fl-pad min-h-[240px]">
          {activeTab === "contract" ? (
            <ContractScanPanel profile={profile} readOnly />
          ) : null}

          {(["commission", "bonus", "lateness"] as const).map((type) =>
            activeTab === type ? (
              <AccountEntryList
                key={type}
                entries={filterEntriesByType(profile.entries, type)}
                emptyLabel={h.noEntriesType.replace(
                  "{type}",
                  h[type].toLowerCase()
                )}
              />
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

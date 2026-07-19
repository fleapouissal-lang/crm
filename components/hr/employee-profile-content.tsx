"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { useDict } from "@/components/shared/i18n-provider";
import { DataPagination } from "@/components/shared/data-pagination";
import { useAdaptivePagination } from "@/hooks/use-adaptive-pagination";
import type { TeamMemberOption } from "@/lib/team/members";
import type {
  EmployeeProfile,
  HrContractScan,
  HrEntry,
  HrEntryType,
  HrProfileTab,
} from "@/lib/hr/types";
import {
  entryTypeBadgeClass,
  filterEntriesByType,
  formatBaseSalary,
  memberStatusBadgeClass,
  sumEntries,
} from "@/lib/hr/types";
import { formatHrEntryValue } from "@/lib/hr/paths";
import { ContractScanPanel } from "@/components/hr/contract-scan-panel";
import { CellMain, FlChip } from "@/components/fusion/primitives";
import { cn } from "@/lib/utils";

function HrProfileTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { key: HrProfileTab; label: string; count: number }[];
  activeTab: HrProfileTab;
  onChange: (tab: HrProfileTab) => void;
}) {
  return (
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
              "mx-0.5 inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-t-lg border-0 border-b-2 px-3.5 py-3 font-[family-name:var(--font-display)] text-[13px] font-medium transition-colors first:ms-0 last:me-0 sm:px-4",
              isActive
                ? "border-[var(--iris-2)] bg-[var(--glass-solid)] font-semibold text-[var(--text)] shadow-[inset_0_-1px_0_var(--glass-solid)]"
                : "border-transparent bg-transparent text-[var(--text-dim)] hover:bg-[color-mix(in_oklch,var(--glass-solid),transparent_50%)] hover:text-[var(--text)]"
            )}
            onClick={() => onChange(tab.key)}
          >
            <span>{tab.label}</span>
            {tab.count > 0 ? (
              <span
                className={cn(
                  "fl-hr-tab__count inline-flex min-w-[1.25rem] items-center justify-center rounded-full border px-1.5 py-px font-mono text-[10.5px] font-semibold leading-tight",
                  isActive
                    ? "border-[color-mix(in_oklch,var(--iris),transparent_70%)] bg-[color-mix(in_oklch,var(--iris),transparent_88%)] text-[var(--iris-2)]"
                    : "border-[var(--border)] bg-[var(--glass-hi)] text-[var(--text-faint)]"
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function HrEntryList({
  entries,
  emptyLabel,
  onAdd,
  addLabel,
}: {
  entries: HrEntry[];
  emptyLabel: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;
  const pagination = useAdaptivePagination(entries, {
    rowHeight: 64,
    resetKey: entries[0]?.id ?? "",
  });

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm fl-faint">{emptyLabel}</p>
        {onAdd ? (
          <button type="button" className="fl-btn sm primary mt-4" onClick={onAdd}>
            <Plus strokeWidth={2} />
            {addLabel ?? h.addEntry}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
     
      className="overflow-hidden rounded-xl border border-[var(--border)]"
    >
      <ul className="fl-hr-log divide-y divide-[var(--border)]">
      {pagination.pageItems.map((entry) => (
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
            {entry.note?.trim() && entry.type !== "note" ? (
              <p className="mt-1 text-[12px] fl-muted">{entry.note}</p>
            ) : null}
          </div>
        </li>
      ))}
      </ul>
      <DataPagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
      />
    </div>
  );
}

export function EmployeeProfileContent({
  member,
  profile,
  onAddEntry,
  onQuickAdd,
  onUploadScan,
  onDeleteScan,
}: {
  member: TeamMemberOption;
  profile: EmployeeProfile;
  onAddEntry?: (type?: HrEntryType) => void;
  onQuickAdd?: (type: HrEntryType) => void;
  onUploadScan?: (input: {
    memberId: string;
    file: File;
    label?: string;
  }) => Promise<HrContractScan | null>;
  onDeleteScan?: (scanId: string) => void;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;
  const b = dict.fusion.badges;

  const [activeTab, setActiveTab] = useState<HrProfileTab>("overview");
  const month = new Date().toISOString().slice(0, 7);

  const counts = useMemo(
    () => ({
      bonus: filterEntriesByType(profile.entries, "bonus").length,
      commission: filterEntriesByType(profile.entries, "commission").length,
      overtime: filterEntriesByType(profile.entries, "overtime").length,
      lateness: filterEntriesByType(profile.entries, "lateness").length,
      leave: filterEntriesByType(profile.entries, "leave").length,
      note: filterEntriesByType(profile.entries, "note").length,
      contract: (profile.contractScans ?? []).length,
    }),
    [profile]
  );

  const tabs: { key: HrProfileTab; label: string; count: number }[] = [
    { key: "overview", label: h.tabOverview, count: 0 },
    { key: "bonus", label: h.bonus, count: counts.bonus },
    { key: "commission", label: h.commission, count: counts.commission },
    { key: "overtime", label: h.overtime, count: counts.overtime },
    { key: "lateness", label: h.lateness, count: counts.lateness },
    { key: "leave", label: h.leave, count: counts.leave },
    { key: "note", label: h.tabNotes, count: counts.note },
    { key: "contract", label: h.tabContract, count: counts.contract },
  ];

  const kpis = [
    {
      label: h.baseSalary,
      value: formatBaseSalary(profile, "â€”"),
    },
    {
      label: h.totalBonus,
      value: `${sumEntries(profile.entries, "bonus").toLocaleString()} MAD`,
    },
    {
      label: h.totalCommission,
      value: `${sumEntries(profile.entries, "commission").toLocaleString()} MAD`,
    },
    {
      label: h.overtimeHours,
      value: `${sumEntries(profile.entries, "overtime", { month })}h`,
    },
    {
      label: h.lateCount,
      value: String(sumEntries(profile.entries, "lateness")),
    },
    {
      label: h.leaveDays,
      value: String(sumEntries(profile.entries, "leave")),
    },
  ];

  function renderTabActions(type: HrEntryType) {
    if (!onQuickAdd) return null;
    return (
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          className="fl-btn sm primary"
          onClick={() => onQuickAdd(type)}
        >
          <Plus strokeWidth={2} />
          {h.addEntry}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="fl-card fl-pad fl-hr-member-hero">
        <CellMain
          initials={member.initials}
          gradient={`linear-gradient(135deg,${member.color},#71717a)`}
          title={member.name}
          sub={profile.roleTitle}
        />
        <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
            <dt className="fl-muted">{h.department}</dt>
            <dd className="font-medium">{h.departments[profile.department]}</dd>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
            <dt className="fl-muted shrink-0">{dict.fusion.settings.phone}</dt>
            <dd className="font-medium text-end truncate">
              {profile.phone?.trim() || member.phone || "â€”"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
            <dt className="fl-muted shrink-0">{h.email}</dt>
            <dd className="font-medium text-end truncate">
              {profile.email?.trim() || member.email || "â€”"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5">
            <dt className="fl-muted">{h.baseSalary}</dt>
            <dd className="font-medium fl-mono">{formatBaseSalary(profile)}</dd>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2.5 sm:col-span-2">
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

      <div className="fl-card fl-hr-profile-card w-full overflow-hidden">
        <HrProfileTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="fl-pad min-h-[280px]">
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {kpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="fl-hr-kpi rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-3"
                  >
                    <div className="fl-tny fl-faint">{kpi.label}</div>
                    <div className="fl-mono mt-1.5 text-[17px] font-semibold tracking-tight">
                      {kpi.value}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">{h.activityLog}</h4>
                  {onAddEntry ? (
                    <button
                      type="button"
                      className="fl-btn sm ghost"
                      onClick={() => onAddEntry()}
                    >
                      <Plus className="size-3.5" strokeWidth={2} />
                      {h.addEntry}
                    </button>
                  ) : null}
                </div>
                <HrEntryList
                  entries={[...profile.entries].sort(
                    (a, b) =>
                      b.date.localeCompare(a.date) ||
                      b.createdAt.localeCompare(a.createdAt)
                  )}
                  emptyLabel={h.noEntries}
                  onAdd={onAddEntry ? () => onAddEntry() : undefined}
                />
              </div>
            </div>
          )}

          {activeTab === "bonus" && (
            <>
              {renderTabActions("bonus")}
              <HrEntryList
                entries={filterEntriesByType(profile.entries, "bonus")}
                emptyLabel={h.noEntriesType.replace("{type}", h.bonus.toLowerCase())}
                onAdd={onQuickAdd ? () => onQuickAdd("bonus") : undefined}
              />
            </>
          )}

          {activeTab === "commission" && (
            <>
              {renderTabActions("commission")}
              <HrEntryList
                entries={filterEntriesByType(profile.entries, "commission")}
                emptyLabel={h.noEntriesType.replace("{type}", h.commission.toLowerCase())}
                onAdd={onQuickAdd ? () => onQuickAdd("commission") : undefined}
              />
            </>
          )}

          {activeTab === "overtime" && (
            <>
              {renderTabActions("overtime")}
              <HrEntryList
                entries={filterEntriesByType(profile.entries, "overtime")}
                emptyLabel={h.noEntriesType.replace("{type}", h.overtime.toLowerCase())}
                onAdd={onQuickAdd ? () => onQuickAdd("overtime") : undefined}
              />
            </>
          )}

          {activeTab === "lateness" && (
            <>
              {renderTabActions("lateness")}
              <HrEntryList
                entries={filterEntriesByType(profile.entries, "lateness")}
                emptyLabel={h.noEntriesType.replace("{type}", h.lateness.toLowerCase())}
                onAdd={onQuickAdd ? () => onQuickAdd("lateness") : undefined}
              />
            </>
          )}

          {activeTab === "leave" && (
            <>
              {renderTabActions("leave")}
              <HrEntryList
                entries={filterEntriesByType(profile.entries, "leave")}
                emptyLabel={h.noEntriesType.replace("{type}", h.leave.toLowerCase())}
                onAdd={onQuickAdd ? () => onQuickAdd("leave") : undefined}
              />
            </>
          )}

          {activeTab === "note" && (
            <>
              {renderTabActions("note")}
              <HrEntryList
                entries={filterEntriesByType(profile.entries, "note")}
                emptyLabel={h.noEntriesType.replace("{type}", h.tabNotes.toLowerCase())}
                onAdd={onQuickAdd ? () => onQuickAdd("note") : undefined}
              />
            </>
          )}

          {activeTab === "contract" && (
            <ContractScanPanel
              profile={profile}
              readOnly={!(onUploadScan && onDeleteScan)}
              onUpload={onUploadScan}
              onDelete={onDeleteScan}
            />
          )}
        </div>
      </div>
    </div>
  );
}

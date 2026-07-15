"use client";

import { Pencil, Plus } from "lucide-react";
import { format } from "date-fns";
import { useDict } from "@/components/shared/i18n-provider";
import type { TeamMemberOption } from "@/lib/team/members";
import type { EmployeeProfile, HrEntry, HrEntryType } from "@/lib/hr/types";
import {
  entryTypeBadgeClass,
  memberStatusBadgeClass,
  sumEntries,
} from "@/lib/hr/types";
import { CellMain, FlChip } from "@/components/fusion/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatHrEntryValue } from "@/lib/hr/paths";
import { cn } from "@/lib/utils";

export function EmployeeDetailDialog({
  open,
  onOpenChange,
  member,
  profile,
  onEditProfile,
  onAddEntry,
  onQuickAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberOption | null;
  profile: EmployeeProfile | null;
  onEditProfile: () => void;
  onAddEntry: () => void;
  onQuickAdd: (type: HrEntryType) => void;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;
  const l = dict.fusion.labels;

  if (!member || !profile) return null;

  const month = new Date().toISOString().slice(0, 7);
  const entries = [...profile.entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  );

  const kpis = [
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

  const quickActions: { type: HrEntryType; label: string }[] = [
    { type: "bonus", label: h.quickAddBonus },
    { type: "commission", label: h.quickAddCommission },
    { type: "overtime", label: h.quickAddOvertime },
    { type: "lateness", label: h.quickAddLateness },
    { type: "leave", label: h.quickAddLeave },
    { type: "note", label: h.quickAddNote },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-2xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{h.viewDossier}</DialogTitle>
        </DialogHeader>

        <div className="fl-dialog-body max-h-[70vh] space-y-5 overflow-y-auto">
          <CellMain
            initials={member.initials}
            gradient={`linear-gradient(135deg,${member.color},#71717a)`}
            title={member.name}
            sub={profile.roleTitle}
          />

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2">
              <dt className="fl-muted">{h.department}</dt>
              <dd className="font-medium">{h.departments[profile.department]}</dd>
            </div>
            <div className="flex justify-between gap-3 rounded-lg bg-[var(--glass-hi)] px-3 py-2 sm:col-span-2">
              <dt className="fl-muted shrink-0">{h.contractAndStatus}</dt>
              <dd className="flex flex-wrap items-center justify-end gap-2">
                <FlChip>{h.contracts[profile.contractType]}</FlChip>
                <span className={cn("fl-badge", memberStatusBadgeClass(profile.status))}>
                  {h.statuses[profile.status]}
                </span>
              </dd>
            </div>
          </dl>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="fl-hr-kpi rounded-xl border border-[var(--border)] p-3">
                <div className="fl-tny fl-faint">{kpi.label}</div>
                <div className="fl-mono mt-1 text-[15px] font-semibold">{kpi.value}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">{h.activityLog}</h4>
              <button type="button" className="fl-btn sm ghost" onClick={onAddEntry}>
                <Plus className="size-3.5" strokeWidth={2} />
                {h.addEntry}
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {quickActions.map((action) => (
                <button
                  key={action.type}
                  type="button"
                  className="fl-btn sm ghost text-[11px]"
                  onClick={() => onQuickAdd(action.type)}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {entries.length === 0 ? (
              <p className="py-8 text-center text-sm fl-faint">{h.noEntries}</p>
            ) : (
              <ul className="fl-hr-log divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                    <span className={cn("fl-badge shrink-0 text-[10px]", entryTypeBadgeClass(entry.type))}>
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
            )}
          </div>
        </div>

        <DialogFooter className="fl-dialog-footer gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {dict.common.cancel}
          </Button>
          <Button type="button" onClick={onEditProfile}>
            <Pencil className="mr-2 size-4" />
            {h.editProfile}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

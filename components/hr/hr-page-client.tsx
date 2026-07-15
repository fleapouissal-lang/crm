"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  X,
  Eye,
  Pencil,
  Gift,
  Coins,
  Clock,
  AlertCircle,
  Palmtree,
  StickyNote,
  Wallet,
} from "lucide-react";
import type { Profile } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
import { CellMain, FlChip, FlProgress, StatLine } from "@/components/fusion/primitives";
import { RowActionsMenu, type RowActionItem } from "@/components/shared/row-actions-menu";
import {
  EmployeeProfileFormDialog,
  HrEntryFormDialog,
} from "@/components/hr/hr-form-dialogs";
import type {
  EmployeeProfile,
  HrDepartment,
  HrEntry,
  HrEntryType,
} from "@/lib/hr/types";
import {
  avgUtilization,
  formatBaseSalary,
  memberStatusBadgeClass,
  sumEntries,
} from "@/lib/hr/types";
import { currentMonthKey, teamPayrollTotals } from "@/lib/hr/payroll";
import { useHrStore } from "@/lib/hr/use-hr-store";
import { hrMemberPath, hrSalaryPath } from "@/lib/hr/paths";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function MemberRowActions({
  onView,
  onSalary,
  onEdit,
  onAddEntry,
  onQuickAdd,
}: {
  onView: () => void;
  onSalary: () => void;
  onEdit: () => void;
  onAddEntry: () => void;
  onQuickAdd: (type: HrEntryType) => void;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;

  const actions: RowActionItem[] = [
    {
      label: h.viewDossier,
      icon: <Eye className="size-4" />,
      onClick: onView,
    },
    {
      label: h.openSalaryAccount,
      icon: <Wallet className="size-4" />,
      onClick: onSalary,
    },
    {
      label: h.addEntry,
      icon: <Plus className="size-4" />,
      onClick: onAddEntry,
    },
    { separator: true },
    {
      label: h.quickAddBonus,
      icon: <Gift className="size-4" />,
      onClick: () => onQuickAdd("bonus"),
    },
    {
      label: h.quickAddCommission,
      icon: <Coins className="size-4" />,
      onClick: () => onQuickAdd("commission"),
    },
    {
      label: h.quickAddOvertime,
      icon: <Clock className="size-4" />,
      onClick: () => onQuickAdd("overtime"),
    },
    {
      label: h.quickAddLateness,
      icon: <AlertCircle className="size-4" />,
      onClick: () => onQuickAdd("lateness"),
    },
    {
      label: h.quickAddLeave,
      icon: <Palmtree className="size-4" />,
      onClick: () => onQuickAdd("leave"),
    },
    {
      label: h.quickAddNote,
      icon: <StickyNote className="size-4" />,
      onClick: () => onQuickAdd("note"),
    },
    { separator: true },
    {
      label: h.editProfile,
      icon: <Pencil className="size-4" />,
      onClick: onEdit,
    },
  ];

  return <RowActionsMenu actions={actions} />;
}

export function HrPageClient({
  profiles,
  initialHrProfiles,
}: {
  profiles: Profile[];
  initialHrProfiles: EmployeeProfile[];
}) {
  const dict = useDict();
  const h = dict.fusion.hr;
  const l = dict.fusion.labels;
  const b = dict.fusion.badges;
  const router = useRouter();

  const {
    hydrated,
    teamOptions,
    hrProfiles,
    profileByMember,
    saveEntry,
    saveProfile,
  } = useHrStore(profiles, initialHrProfiles);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<HrDepartment | "all">("all");

  const [entryOpen, setEntryOpen] = useState(false);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [entryDefaultType, setEntryDefaultType] = useState<HrEntryType | undefined>();

  const activeMember = teamOptions.find((m) => m.id === activeMemberId) ?? null;
  const activeProfile = activeMemberId
    ? profileByMember.get(activeMemberId) ?? null
    : null;

  const month = currentMonthKey();

  const kpis = useMemo(() => {
    const totals = teamPayrollTotals(hrProfiles, month);
    return {
      headcount: teamOptions.length,
      avgUtil: avgUtilization(hrProfiles),
      payroll: totals.baseMass,
      estimated: totals.estimatedMass,
      overtimeMonth: totals.overtimeHours,
      withSalary: totals.withSalary,
    };
  }, [hrProfiles, teamOptions, month]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teamOptions.filter((member) => {
      const profile = profileByMember.get(member.id);
      if (deptFilter !== "all" && profile?.department !== deptFilter) return false;
      if (!q) return true;
      return (
        member.name.toLowerCase().includes(q) ||
        member.initials.toLowerCase().includes(q) ||
        profile?.roleTitle.toLowerCase().includes(q) ||
        (profile?.email ?? "").toLowerCase().includes(q) ||
        (profile?.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [teamOptions, profileByMember, search, deptFilter]);

  function openMember(
    memberId: string,
    mode: "entry" | "profile" | "quick",
    entryType?: HrEntryType
  ) {
    setActiveMemberId(memberId);
    if (mode === "entry") {
      setEntryDefaultType(undefined);
      setEntryOpen(true);
    }
    if (mode === "profile") setProfileFormOpen(true);
    if (mode === "quick") {
      setEntryDefaultType(entryType);
      setEntryOpen(true);
    }
  }

  function goToProfile(memberId: string) {
    router.push(hrMemberPath(memberId));
  }

  function goToSalary(memberId: string) {
    router.push(hrSalaryPath(memberId));
  }

  function handleSaveEntry(entry: HrEntry) {
    saveEntry(entry);
  }

  function handleSaveProfile(profile: EmployeeProfile) {
    saveProfile(profile);
  }

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-xl bg-[var(--glass-hi)]" />;
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{h.headcount}</div>
          <StatLine value={String(kpis.headcount)} />
          <div className="k-foot fl-faint mt-2">
            {kpis.withSalary}/{kpis.headcount} {h.membersWithSalary.toLowerCase()}
          </div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{h.massSalary}</div>
          <StatLine value={kpis.payroll.toLocaleString("fr-FR")} unit="MAD" />
          <div className="k-foot fl-faint mt-2">{h.baseSalary}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{h.estimatedPayroll}</div>
          <StatLine value={kpis.estimated.toLocaleString("fr-FR")} unit="MAD" />
          <div className="k-foot fl-faint mt-2">{l.thisMonth}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{h.overtimeHours}</div>
          <StatLine value={String(kpis.overtimeMonth)} unit="h" />
          <FlProgress
            value={Math.min(100, kpis.avgUtil)}
            className="mt-3"
          />
        </div>
      </div>

      <div className="fl-card fl-clients-card">
        <div className="fl-clients-toolbar">
          <h2 className="fl-clients-toolbar__title">{h.team}</h2>
          <div className="fl-clients-toolbar__row">
            <div className="fl-clients-search-wrap">
              <Search strokeWidth={2} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={h.searchPlaceholder}
                className="fl-clients-search"
              />
            </div>

            <div className="fl-clients-status">
              <Select
                value={deptFilter}
                onValueChange={(v) =>
                  setDeptFilter((v as HrDepartment | "all") ?? "all")
                }
              >
                <SelectTrigger className="fl-select-trigger w-full">
                  <SelectValue placeholder={h.filterDepartment} />
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="end">
                  <SelectItem value="all">{h.allDepartments}</SelectItem>
                  {(Object.keys(h.departments) as HrDepartment[]).map((d) => (
                    <SelectItem key={d} value={d}>
                      {h.departments[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(search || deptFilter !== "all") && (
              <button
                type="button"
                className="fl-btn sm ghost shrink-0"
                onClick={() => {
                  setSearch("");
                  setDeptFilter("all");
                }}
              >
                <X className="size-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        <div className="fl-tbl-wrap">
          <table className="fl-tbl fl-tbl-clients fl-tbl-hr">
            <thead>
              <tr>
                <th>{l.person}</th>
                <th>{h.department}</th>
                <th>{h.contact}</th>
                <th>{h.baseSalary}</th>
                <th>{h.overtime}</th>
                <th>{h.lateness}</th>
                <th>{h.contractAndStatus}</th>
                <th className="col-actions" />
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center fl-faint">
                    {h.noEntries}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const profile = profileByMember.get(member.id)!;
                  const entries = profile.entries;
                  const phone = profile.phone?.trim() || member.phone || "";
                  const email = profile.email?.trim() || member.email || "";
                  return (
                    <tr
                      key={member.id}
                      className="fl-hr-row"
                      onClick={() => goToProfile(member.id)}
                    >
                      <td>
                        <Link
                          href={hrMemberPath(member.id)}
                          className="block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CellMain
                            initials={member.initials}
                            gradient={`linear-gradient(135deg,${member.color},#71717a)`}
                            title={member.name}
                            sub={profile.roleTitle}
                          />
                        </Link>
                      </td>
                      <td className="fl-muted max-w-[140px] truncate">
                        {h.departments[profile.department]}
                      </td>
                      <td className="max-w-[180px]">
                        <div className="truncate text-[13px]">
                          {phone || email || "—"}
                        </div>
                        {phone && email ? (
                          <div className="truncate text-[11px] fl-faint">{email}</div>
                        ) : null}
                      </td>
                      <td
                        className="fl-mono text-[13px] whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={hrSalaryPath(member.id)}
                          className="inline-flex items-center gap-1.5 hover:underline"
                        >
                          <Wallet className="size-3.5 opacity-60" />
                          {formatBaseSalary(profile)}
                        </Link>
                      </td>
                      <td className="fl-mono text-[13px]">
                        {sumEntries(entries, "overtime", { month })}h
                      </td>
                      <td className="fl-mono text-[13px]">
                        {sumEntries(entries, "lateness")}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <FlChip>{h.contracts[profile.contractType]}</FlChip>
                          <span
                            className={cn(
                              "fl-badge",
                              memberStatusBadgeClass(profile.status)
                            )}
                          >
                            {profile.status === "active"
                              ? b.active
                              : h.statuses[profile.status]}
                          </span>
                        </div>
                      </td>
                      <td
                        className="col-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MemberRowActions
                          onView={() => goToProfile(member.id)}
                          onSalary={() => goToSalary(member.id)}
                          onEdit={() => openMember(member.id, "profile")}
                          onAddEntry={() => openMember(member.id, "entry")}
                          onQuickAdd={(type) => openMember(member.id, "quick", type)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HrEntryFormDialog
        open={entryOpen}
        onOpenChange={setEntryOpen}
        member={activeMember}
        defaultType={entryDefaultType}
        onSave={handleSaveEntry}
      />

      <EmployeeProfileFormDialog
        open={profileFormOpen}
        onOpenChange={setProfileFormOpen}
        profile={activeProfile}
        member={activeMember}
        onSave={handleSaveProfile}
      />
    </div>
  );
}

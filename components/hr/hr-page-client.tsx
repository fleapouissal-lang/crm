"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search, X, Eye, Pencil, Wallet, Trash2 } from "lucide-react";
import type { OrgJobRole, Profile, Role } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
import { DataPagination } from "@/components/shared/data-pagination";
import { CellMain, FlChip, FlProgress, StatLine } from "@/components/fusion/primitives";
import { useAdaptivePagination } from "@/hooks/use-adaptive-pagination";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { EmployeeProfileFormDialog } from "@/components/hr/hr-form-dialogs";
import { TeamMemberDialog } from "@/components/settings/team-member-dialog";
import { TeamMemberAccessDialog } from "@/components/settings/team-member-access-dialog";
import { deleteTeamMember } from "@/lib/actions/organizations";
import {
  canRemoveTeamMember,
  canResetTeamMemberPassword,
} from "@/lib/permissions";
import type { EmployeeProfile, HrDepartment } from "@/lib/hr/types";
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
  onEdit,
  onRemove,
}: {
  onView: () => void;
  onEdit: () => void;
  onRemove?: () => void;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;
  const s = dict.fusion.settings;

  return (
    <div
      className="flex items-center justify-end gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="rowbtn"
        aria-label={h.viewDossier}
        title={h.viewDossier}
        onClick={onView}
      >
        <Eye className="size-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        className="rowbtn"
        aria-label={dict.common.edit}
        title={dict.common.edit}
        onClick={onEdit}
      >
        <Pencil className="size-4" strokeWidth={2} />
      </button>
      {onRemove ? (
        <button
          type="button"
          className="rowbtn rowbtn--danger"
          aria-label={s.removeMember}
          title={s.removeMember}
          onClick={onRemove}
        >
          <Trash2 className="size-4" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

export function HrPageClient({
  profiles,
  initialHrProfiles,
  canManageUsers = false,
  actorId = "",
  actorRole = "member",
  jobRoles = [],
  emailDomain = null,
}: {
  profiles: Profile[];
  initialHrProfiles: EmployeeProfile[];
  canManageUsers?: boolean;
  actorId?: string;
  actorRole?: Role;
  jobRoles?: OrgJobRole[];
  emailDomain?: string | null;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;
  const s = dict.fusion.settings;
  const l = dict.fusion.labels;
  const b = dict.fusion.badges;
  const router = useRouter();

  const {
    hydrated,
    teamOptions,
    hrProfiles,
    profileByMember,
    saveProfile,
  } = useHrStore(profiles, initialHrProfiles);

  const crmProfileById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<HrDepartment | "all">("all");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Profile | null>(null);
  const [accessTarget, setAccessTarget] = useState<Profile | null>(null);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

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

  const pagination = useAdaptivePagination(filteredMembers, {
    rowHeight: 68,
    resetKey: `${deptFilter}:${search}`,
  });

  function goToProfile(memberId: string) {
    router.push(hrMemberPath(memberId));
  }

  function handleSaveProfile(next: EmployeeProfile) {
    void saveProfile(next);
    setProfileFormOpen(false);
  }

  function handleEditMember(memberId: string, crmProfile: Profile | undefined) {
    const canManageAccount =
      canManageUsers &&
      !!crmProfile &&
      canResetTeamMemberPassword(
        { id: actorId, role: actorRole },
        crmProfile
      );

    if (canManageAccount && crmProfile) {
      setAccessTarget(crmProfile);
      return;
    }

    setActiveMemberId(memberId);
    setProfileFormOpen(true);
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fl-card fl-pad h-28 animate-pulse bg-[var(--glass)]" />
          ))}
        </div>
        <div className="fl-card h-96 animate-pulse bg-[var(--glass)]" />
      </div>
    );
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className="fl-clients-toolbar__head">
            <h2 className="fl-clients-toolbar__title">{h.team}</h2>
            <div className="fl-clients-toolbar__actions">
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
                    <SelectValue placeholder={h.filterDepartment}>
                      {deptFilter === "all"
                        ? h.allDepartments
                        : h.departments[deptFilter]}
                    </SelectValue>
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

              {canManageUsers ? (
                <button
                  type="button"
                  className="fl-btn primary sm fl-toolbar-create shrink-0"
                  onClick={() => setMemberDialogOpen(true)}
                >
                  <Plus strokeWidth={2} />
                  <span className="fl-toolbar-create__label hidden sm:inline">
                    {s.addMember}
                  </span>
                </button>
              ) : null}
            </div>
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
                  <td colSpan={8} className="py-16 text-center fl-faint">
                    {h.noEntries}
                  </td>
                </tr>
              ) : (
                pagination.pageItems.map((member) => {
                  const profile = profileByMember.get(member.id)!;
                  const crmProfile = crmProfileById.get(member.id);
                  const entries = profile.entries;
                  const phone = profile.phone?.trim() || member.phone || "";
                  const email = profile.email?.trim() || member.email || "";
                  const canRemove =
                    canManageUsers &&
                    !!crmProfile &&
                    canRemoveTeamMember(
                      { id: actorId, role: actorRole },
                      crmProfile
                    );
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
                          onEdit={() => handleEditMember(member.id, crmProfile)}
                          onRemove={
                            canRemove && crmProfile
                              ? () => setRemoveTarget(crmProfile)
                              : undefined
                          }
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <DataPagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
        />
      </div>

      <EmployeeProfileFormDialog
        open={profileFormOpen}
        onOpenChange={setProfileFormOpen}
        profile={activeProfile}
        member={activeMember}
        onSave={handleSaveProfile}
      />

      {canManageUsers ? (
        <TeamMemberDialog
          open={memberDialogOpen}
          onOpenChange={setMemberDialogOpen}
          jobRoles={jobRoles}
          emailDomain={emailDomain}
          actorRole={actorRole}
          onCreated={() => router.refresh()}
        />
      ) : null}

      <TeamMemberAccessDialog
        open={!!accessTarget}
        onOpenChange={(open) => {
          if (!open) setAccessTarget(null);
        }}
        member={accessTarget}
        jobRoles={jobRoles}
        actorRole={actorRole}
        onUpdated={() => router.refresh()}
      />

      <DeleteConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title={s.removeMemberTitle}
        description={s.removeMemberConfirm.replace(
          "{name}",
          removeTarget?.full_name ??
            removeTarget?.email ??
            dict.common.user
        )}
        confirmLabel={dict.common.delete}
        onConfirm={async () => {
          if (!removeTarget) return;
          const result = await deleteTeamMember(removeTarget.id);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success(s.memberRemoved);
          setRemoveTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
}

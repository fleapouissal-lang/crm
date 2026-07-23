"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateTeamMemberAccess } from "@/lib/actions/organizations";
import type { OrgJobRole, Profile, Role } from "@/types/database";
import {
  jobRoleAccessKey,
  suggestedAccessRole,
} from "@/lib/organizations/job-role-access";
import { useDict } from "@/components/shared/i18n-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PERMISSION_ROLES: Role[] = ["admin", "manager", "member"];

export function TeamMemberAccessDialog({
  open,
  onOpenChange,
  member,
  jobRoles,
  actorRole,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Profile | null;
  jobRoles: OrgJobRole[];
  actorRole: Role;
  onUpdated?: () => void;
}) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const allowedRoles =
    actorRole === "admin"
      ? PERMISSION_ROLES
      : PERMISSION_ROLES.filter((r) => r !== "admin");

  const [jobRoleId, setJobRoleId] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !member) return;
    const roles =
      actorRole === "admin"
        ? PERMISSION_ROLES
        : PERMISSION_ROLES.filter((r) => r !== "admin");
    const currentJobId =
      member.job_role_id ??
      jobRoles.find((j) => j.slug === member.job_role?.slug)?.id ??
      jobRoles[0]?.id ??
      "";
    setJobRoleId(currentJobId);
    const nextRole =
      actorRole === "manager" && member.role === "admin"
        ? "manager"
        : roles.includes(member.role)
          ? member.role
          : "member";
    setRole(nextRole);
  }, [open, member, jobRoles, actorRole]);

  const selectedJob = jobRoles.find((j) => j.id === jobRoleId);
  const accessHint = s.jobAccess[jobRoleAccessKey(selectedJob?.slug)];
  const memberName =
    member?.full_name ?? member?.email ?? dict.common.user;

  function onJobRoleChange(id: string) {
    setJobRoleId(id);
    const job = jobRoles.find((j) => j.id === id);
    const suggested = suggestedAccessRole(job?.slug);
    if (actorRole === "manager" && suggested === "admin") {
      setRole("manager");
    } else if (allowedRoles.includes(suggested)) {
      setRole(suggested);
    } else {
      setRole("member");
    }
  }

  function handleSave() {
    if (!member) return;
    startTransition(async () => {
      const result = await updateTeamMemberAccess({
        memberId: member.id,
        role,
        jobRoleId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(s.memberAccessUpdated);
      onOpenChange(false);
      onUpdated?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" strokeWidth={2} />
            {s.editMemberAccessTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm fl-muted">
            {s.editMemberAccessHint.replace("{name}", memberName)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="fl-field">
              <label className="fl-field-label">{s.jobRole}</label>
              <Select
                value={jobRoleId || null}
                onValueChange={(v) => v && onJobRoleChange(v)}
              >
                <SelectTrigger className="fl-select-trigger fl-input w-full">
                  <SelectValue placeholder={s.selectJobRole}>
                    {selectedJob?.name ?? s.selectJobRole}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel">
                  {jobRoles.map((jr) => (
                    <SelectItem key={jr.id} value={jr.id}>
                      {jr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="fl-field">
              <label className="fl-field-label">{s.accessLevel}</label>
              <Select
                value={role}
                onValueChange={(v) => v && setRole(v as Role)}
              >
                <SelectTrigger className="fl-select-trigger fl-input w-full">
                  <SelectValue>{dict.roles[role]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel">
                  {allowedRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {dict.roles[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedJob ? (
            <p className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] px-3 py-2 text-[12.5px] fl-muted">
              <b className="text-[var(--text)]">{selectedJob.name}</b>
              {" · "}
              {accessHint}
            </p>
          ) : null}
        </div>
        <DialogFooter className="fl-dialog-footer">
          <button
            type="button"
            className="fl-btn sm ghost"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {dict.common.cancel}
          </button>
          <button
            type="button"
            className="fl-btn sm primary"
            disabled={pending || !member || !jobRoleId}
            onClick={handleSave}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Pencil className="size-3.5" strokeWidth={2} />
            )}
            {pending ? dict.common.working : dict.common.save}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

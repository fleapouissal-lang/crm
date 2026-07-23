"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createTeamMember } from "@/lib/actions/organizations";
import type { OrgJobRole, Role } from "@/types/database";
import {
  jobRoleAccessKey,
  suggestedAccessRole,
} from "@/lib/organizations/job-role-access";
import { useDict } from "@/components/shared/i18n-provider";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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

export function TeamMemberDialog({
  open,
  onOpenChange,
  jobRoles,
  emailDomain: _emailDomain,
  actorRole,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobRoles: OrgJobRole[];
  /** Kept for call-site compatibility; member emails are personal and not domain-bound */
  emailDomain: string | null;
  actorRole: Role;
  onCreated?: () => void;
}) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const allowedRoles =
    actorRole === "admin"
      ? PERMISSION_ROLES
      : PERMISSION_ROLES.filter((r) => r !== "admin");

  const defaultJobId = jobRoles[0]?.id ?? "";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [jobRoleId, setJobRoleId] = useState(defaultJobId);
  const [role, setRole] = useState<Role>(() =>
    suggestedAccessRole(jobRoles[0]?.slug)
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const first = jobRoles[0];
    setJobRoleId(first?.id ?? "");
    const suggested = suggestedAccessRole(first?.slug);
    setRole(
      actorRole === "manager" && suggested === "admin" ? "manager" : suggested
    );
  }, [open, jobRoles, actorRole]);

  const selectedJob = jobRoles.find((j) => j.id === jobRoleId);
  const accessHintKey = jobRoleAccessKey(selectedJob?.slug);
  const accessHint = s.jobAccess[accessHintKey];

  function reset() {
    setFullName("");
    setEmail("");
    setPassword("");
    const first = jobRoles[0];
    setJobRoleId(first?.id ?? "");
    const suggested = suggestedAccessRole(first?.slug);
    setRole(
      actorRole === "manager" && suggested === "admin" ? "manager" : suggested
    );
  }

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

  function handleSubmit() {
    startTransition(async () => {
      const result = await createTeamMember({
        fullName,
        email,
        password,
        role,
        jobRoleId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(s.memberCreated);
      reset();
      onOpenChange(false);
      onCreated?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content sm:max-w-md">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{s.addMember}</DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-4">
          <div className="fl-field">
            <label className="fl-field-label">{s.fullName}</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="fl-input"
              placeholder="Ouissal Benali"
            />
          </div>
          <div className="fl-field">
            <label className="fl-field-label" htmlFor="member-email">
              {dict.common.email}
            </label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fl-input"
              placeholder="ouissal@gmail.com"
              autoComplete="email"
            />
            <small className="mt-1 block text-xs fl-faint">
              {s.memberPersonalEmailHint}
            </small>
          </div>
          <div className="fl-field">
            <label className="fl-field-label">{dict.common.password}</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputClassName="fl-input"
              minLength={6}
              autoComplete="new-password"
            />
          </div>
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
                  {jobRoles.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      {s.noJobRoles}
                    </SelectItem>
                  ) : (
                    jobRoles.map((jr) => (
                      <SelectItem key={jr.id} value={jr.id}>
                        {jr.name}
                      </SelectItem>
                    ))
                  )}
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
              <br />
              <span className="fl-faint">
                {role === "admin"
                  ? s.accessAdminHint
                  : role === "manager"
                    ? s.accessManagerHint
                    : s.accessMemberHint}
              </span>
            </p>
          ) : null}
        </div>
        <DialogFooter className="fl-dialog-footer">
          <button
            type="button"
            className="fl-btn sm ghost"
            onClick={() => onOpenChange(false)}
          >
            {dict.common.cancel}
          </button>
          <button
            type="button"
            className="fl-btn sm primary"
            disabled={
              pending ||
              !fullName.trim() ||
              !email.trim() ||
              !password ||
              !jobRoleId
            }
            onClick={handleSubmit}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {s.addMember}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

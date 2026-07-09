"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createTeamMember } from "@/lib/actions/organizations";
import type { OrgJobRole, Role } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
import { Input } from "@/components/ui/input";
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
  emailDomain,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobRoles: OrgJobRole[];
  emailDomain: string | null;
}) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const [fullName, setFullName] = useState("");
  const [emailLocal, setEmailLocal] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [jobRoleId, setJobRoleId] = useState(jobRoles[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  function reset() {
    setFullName("");
    setEmailLocal("");
    setPassword("");
    setRole("member");
    setJobRoleId(jobRoles[0]?.id ?? "");
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createTeamMember({
        fullName,
        emailLocal,
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
            <label className="fl-field-label">{dict.common.email}</label>
            <div className="flex items-center gap-0 overflow-hidden rounded-[11px] border border-[var(--border)]">
              <Input
                value={emailLocal}
                onChange={(e) => setEmailLocal(e.target.value.replace(/@.+$/, ""))}
                className="fl-input border-0 shadow-none focus-visible:ring-0"
                placeholder="ouissal"
              />
              <span className="shrink-0 bg-[var(--glass-hi)] px-3 py-2 text-sm fl-faint">
                @{emailDomain ?? "entreprise.com"}
              </span>
            </div>
          </div>
          <div className="fl-field">
            <label className="fl-field-label">{dict.common.password}</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="fl-input"
              minLength={6}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="fl-field">
              <label className="fl-field-label">{s.jobRole}</label>
              <Select value={jobRoleId} onValueChange={(v) => v && setJobRoleId(v)}>
                <SelectTrigger className="fl-input w-full">
                  <SelectValue placeholder={s.selectJobRole} />
                </SelectTrigger>
                <SelectContent>
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
              <Select value={role} onValueChange={(v) => v && setRole(v as Role)}>
                <SelectTrigger className="fl-input w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERMISSION_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {dict.roles[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="fl-dialog-footer">
          <button type="button" className="fl-btn sm ghost" onClick={() => onOpenChange(false)}>
            {dict.common.cancel}
          </button>
          <button
            type="button"
            className="fl-btn sm primary"
            disabled={pending || !fullName.trim() || !emailLocal.trim() || !password || !jobRoleId}
            onClick={handleSubmit}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {s.addMember}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

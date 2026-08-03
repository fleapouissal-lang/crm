"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Briefcase,
  KeyRound,
  Loader2,
  Shield,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { updateTeamMemberAccess } from "@/lib/actions/organizations";
import type { OrgJobRole, Profile, Role } from "@/types/database";
import {
  buildStagiaireMemberPages,
  isStagiaireJob,
  jobRoleAccessKey,
  memberPagesForJob,
  STAGIAIRE_DEFAULT_TOGGLES,
  stagiaireTogglesFromPages,
  suggestedAccessRole,
  type MemberPageNavKey,
} from "@/lib/organizations/job-role-access";
import { StagiairePagesPicker } from "@/components/settings/stagiaire-pages-picker";
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

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

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

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobRoleId, setJobRoleId] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [stagiaireToggles, setStagiaireToggles] = useState<MemberPageNavKey[]>([
    ...STAGIAIRE_DEFAULT_TOGGLES,
  ]);
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
    setFullName(member.full_name ?? "");
    setEmail(member.email ?? "");
    setPhone(member.phone ?? "");
    setJobRoleId(currentJobId);
    setPassword("");
    setConfirmPassword("");
    const currentJob =
      jobRoles.find((j) => j.id === currentJobId) ??
      jobRoles.find((j) => j.slug === member.job_role?.slug) ??
      null;
    if (isStagiaireJob(currentJob?.slug, currentJob?.name ?? member.job_role?.name)) {
      setRole("member");
      setStagiaireToggles(stagiaireTogglesFromPages(member.member_pages));
      return;
    }
    setStagiaireToggles([...STAGIAIRE_DEFAULT_TOGGLES]);
    const nextRole =
      actorRole === "manager" && member.role === "admin"
        ? "manager"
        : roles.includes(member.role)
          ? member.role
          : "member";
    setRole(nextRole);
  }, [open, member, jobRoles, actorRole]);

  const selectedJob = jobRoles.find((j) => j.id === jobRoleId);
  const isInternJob = isStagiaireJob(selectedJob?.slug, selectedJob?.name);
  const accessHint = s.jobAccess[jobRoleAccessKey(selectedJob?.slug, selectedJob?.name)];
  const memberPages = isInternJob
    ? buildStagiaireMemberPages(stagiaireToggles)
    : memberPagesForJob(selectedJob?.slug, selectedJob?.name);
  const roleLockedToMember = isInternJob;
  const effectiveRole: Role = roleLockedToMember ? "member" : role;
  const displayName = fullName.trim() || member?.email || dict.common.user;
  const accessLabel =
    effectiveRole === "admin"
      ? s.accessAdminHint
      : effectiveRole === "manager"
        ? s.accessManagerHint
        : s.accessMemberHint;

  function navLabelForPage(page: MemberPageNavKey): string {
    return dict.nav[page] ?? page;
  }

  function onJobRoleChange(id: string) {
    setJobRoleId(id);
    const job = jobRoles.find((j) => j.id === id);
    if (isStagiaireJob(job?.slug, job?.name)) {
      setRole("member");
      setStagiaireToggles(
        member
          ? stagiaireTogglesFromPages(member.member_pages)
          : [...STAGIAIRE_DEFAULT_TOGGLES]
      );
      return;
    }
    const suggested = suggestedAccessRole(job?.slug, job?.name);
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
    if (!fullName.trim()) {
      toast.error(s.fullNameRequired);
      return;
    }
    if (!email.trim()) {
      toast.error(dict.auth.errors.emailPassword);
      return;
    }
    if (password || confirmPassword) {
      if (password.length < 6) {
        toast.error(dict.auth.errors.passwordMin);
        return;
      }
      if (password !== confirmPassword) {
        toast.error(s.passwordMismatch);
        return;
      }
    }

    startTransition(async () => {
      const result = await updateTeamMemberAccess({
        memberId: member.id,
        role: roleLockedToMember ? "member" : role,
        jobRoleId,
        fullName,
        email,
        phone,
        password: password || undefined,
        memberPages: isInternJob
          ? buildStagiaireMemberPages(stagiaireToggles)
          : null,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        password ? s.memberProfileAndPasswordUpdated : s.memberAccessUpdated
      );
      onOpenChange(false);
      onUpdated?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content fl-dialog-content--lg ring-0 sm:max-w-xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl text-white shadow-sm"
              style={{ background: "var(--grad-brand)" }}
            >
              <UserRound className="size-5" strokeWidth={1.75} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span>{s.editMemberAccessTitle}</span>
              <span className="truncate text-xs font-normal fl-faint">
                {s.editMemberAccessHint.replace("{name}", displayName)}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="fl-dialog-body max-h-[70vh] space-y-4 overflow-y-auto">
          <div className="fl-hr-profile-dialog__hero">
            <div className="flex items-center gap-3">
              <span
                className="grid size-11 place-items-center rounded-xl text-[13px] font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#52525b,#3ecf8e)",
                }}
              >
                {initialsFromName(displayName)}
              </span>
              <div className="min-w-0">
                <b className="block truncate text-[14px]">{displayName}</b>
                <span className="block truncate text-[12px] fl-faint">
                  {selectedJob?.name ?? s.selectJobRole}
                  {" · "}
                  {dict.roles[role]}
                </span>
              </div>
            </div>
          </div>

          <section className="fl-form-section">
            <div className="fl-form-section__head">
              <UserRound
                className="size-3.5 text-[var(--iris)]"
                strokeWidth={1.75}
              />
              <h4>{s.editMemberIdentitySection}</h4>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="fl-field sm:col-span-2">
                <label className="fl-field-label" htmlFor="edit-member-name">
                  {s.fullName} *
                </label>
                <Input
                  id="edit-member-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="fl-input"
                  placeholder="Ouissal Benali"
                  autoComplete="name"
                />
              </div>
              <div className="fl-field">
                <label className="fl-field-label" htmlFor="edit-member-email">
                  {dict.common.email} *
                </label>
                <Input
                  id="edit-member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="fl-input"
                  placeholder="ouissal@gmail.com"
                  autoComplete="email"
                />
              </div>
              <div className="fl-field">
                <label className="fl-field-label" htmlFor="edit-member-phone">
                  {s.phone}
                </label>
                <Input
                  id="edit-member-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="fl-input"
                  placeholder={s.phonePlaceholder}
                  autoComplete="tel"
                />
              </div>
            </div>
          </section>

          <section className="fl-form-section">
            <div className="fl-form-section__head">
              <Briefcase
                className="size-3.5 text-[var(--iris)]"
                strokeWidth={1.75}
              />
              <h4>{s.editMemberAccessSection}</h4>
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
                  value={effectiveRole}
                  onValueChange={(v) => v && setRole(v as Role)}
                  disabled={roleLockedToMember}
                >
                  <SelectTrigger className="fl-select-trigger fl-input w-full">
                    <SelectValue>{dict.roles[effectiveRole]}</SelectValue>
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
            {isInternJob ? (
              <div className="mt-3">
                <StagiairePagesPicker
                  value={stagiaireToggles}
                  onChange={setStagiaireToggles}
                />
              </div>
            ) : selectedJob ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] px-3 py-2.5 text-[12.5px] leading-relaxed fl-muted">
                <Shield
                  className="mt-0.5 size-3.5 shrink-0 text-[var(--iris)]"
                  strokeWidth={1.75}
                />
                <div className="min-w-0 space-y-2">
                  <p>
                    <b className="text-[var(--text)]">{selectedJob.name}</b>
                    {" · "}
                    {accessHint}
                  </p>
                  {effectiveRole === "member" ? (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-medium text-[var(--text)]">
                        {s.jobAccessPagesLabel}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {memberPages.map((page) => (
                          <span
                            key={page}
                            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-[11px] text-[var(--text)]"
                          >
                            {navLabelForPage(page)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <p className="fl-faint">{accessLabel}</p>
                </div>
              </div>
            ) : null}
          </section>

          <section className="fl-form-section">
            <div className="fl-form-section__head">
              <KeyRound
                className="size-3.5 text-[var(--iris)]"
                strokeWidth={1.75}
              />
              <h4>{s.editMemberPasswordSection}</h4>
            </div>
            <p className="mb-3 text-[12px] fl-faint">
              {s.editMemberPasswordHint}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="fl-field">
                <label
                  className="fl-field-label"
                  htmlFor="edit-member-password"
                >
                  {s.newPassword}
                </label>
                <PasswordInput
                  id="edit-member-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  inputClassName="fl-input"
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </div>
              <div className="fl-field">
                <label
                  className="fl-field-label"
                  htmlFor="edit-member-confirm-password"
                >
                  {s.confirmPassword}
                </label>
                <PasswordInput
                  id="edit-member-confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  inputClassName="fl-input"
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="fl-dialog-footer gap-2 border-t border-[var(--border)] pt-4 sm:gap-0">
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
            disabled={pending || !member || !jobRoleId || !fullName.trim() || !email.trim()}
            onClick={handleSave}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {pending ? dict.common.working : dict.common.save}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

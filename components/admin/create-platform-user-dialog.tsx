"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  createPlatformManagedUser,
  getOrgJobRolesAsPlatformAdmin,
} from "@/lib/actions/platform-admin";
import type { OrgJobRole, Organization, Role } from "@/types/database";
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
import { cn } from "@/lib/utils";

const COMPANY_ROLES: Role[] = ["admin", "manager", "member"];

type CreateMode = "platform" | "company";

export function CreatePlatformUserDialog({
  open,
  onOpenChange,
  organizations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: Organization[];
}) {
  const dict = useDict();
  const d = dict.fusion.platformAdmin;
  const s = dict.fusion.settings;
  const router = useRouter();
  const [mode, setMode] = useState<CreateMode>("company");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationId, setOrganizationId] = useState(
    organizations[0]?.id ?? ""
  );
  const [jobRoles, setJobRoles] = useState<OrgJobRole[]>([]);
  const [jobRoleId, setJobRoleId] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [pending, startTransition] = useTransition();

  const selectedOrg = useMemo(
    () => organizations.find((o) => o.id === organizationId) ?? null,
    [organizations, organizationId]
  );
  const selectedJob = jobRoles.find((j) => j.id === jobRoleId);
  const accessHintKey = jobRoleAccessKey(selectedJob?.slug);
  const accessHint = s.jobAccess[accessHintKey];

  useEffect(() => {
    if (!open) return;
    setMode("company");
    setFullName("");
    setEmail("");
    setPassword("");
    setOrganizationId(organizations[0]?.id ?? "");
    setJobRoles([]);
    setJobRoleId("");
    setRole("member");
  }, [open, organizations]);

  useEffect(() => {
    if (!open || mode !== "company" || !organizationId) {
      setJobRoles([]);
      setJobRoleId("");
      return;
    }

    let cancelled = false;
    setLoadingRoles(true);
    void getOrgJobRolesAsPlatformAdmin(organizationId).then((roles) => {
      if (cancelled) return;
      setJobRoles(roles);
      const first = roles[0];
      setJobRoleId(first?.id ?? "");
      setRole(suggestedAccessRole(first?.slug));
      setLoadingRoles(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, mode, organizationId]);

  function onJobRoleChange(id: string) {
    setJobRoleId(id);
    const job = jobRoles.find((j) => j.id === id);
    setRole(suggestedAccessRole(job?.slug));
  }

  function handleSubmit() {
    startTransition(async () => {
      const result =
        mode === "platform"
          ? await createPlatformManagedUser({
              mode: "platform",
              fullName,
              email,
              password,
            })
          : await createPlatformManagedUser({
              mode: "company",
              fullName,
              email,
              password,
              organizationId,
              role,
              jobRoleId,
            });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(d.userCreated);
      onOpenChange(false);
      router.refresh();
    });
  }

  const canSubmit =
    fullName.trim().length > 0 &&
    password.length >= 6 &&
    email.trim().includes("@") &&
    (mode === "platform" ? true : Boolean(organizationId && jobRoleId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{d.addUser}</DialogTitle>
        </DialogHeader>

        <div className="fl-dialog-body space-y-4">
          <div className="fl-seg w-full">
            <button
              type="button"
              className={cn("flex-1", mode === "company" && "on")}
              onClick={() => setMode("company")}
            >
              <Building2 className="size-3.5" />
              {d.createUserModeCompany}
            </button>
            <button
              type="button"
              className={cn("flex-1", mode === "platform" && "on")}
              onClick={() => setMode("platform")}
            >
              <Shield className="size-3.5" />
              {d.createUserModePlatform}
            </button>
          </div>

          <p className="text-xs fl-faint">
            {mode === "platform"
              ? d.createUserPlatformHint
              : d.createUserCompanyHint}
          </p>

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
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fl-input"
              placeholder={
                mode === "platform"
                  ? "admin@fusionleap.com"
                  : "ouissal@gmail.com"
              }
              autoComplete="off"
            />
            {mode === "company" ? (
              <small className="mt-1 block text-xs fl-faint">
                {s.memberPersonalEmailHint}
              </small>
            ) : null}
          </div>

          {mode === "company" ? (
            <div className="fl-field">
              <label className="fl-field-label">{d.selectCompany}</label>
              <Select
                value={organizationId || null}
                onValueChange={(v) => v && setOrganizationId(v)}
              >
                <SelectTrigger className="fl-select-trigger fl-input w-full">
                  <SelectValue placeholder={d.selectCompany}>
                    {selectedOrg?.name ?? d.selectCompany}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel">
                  {organizations.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      {d.noCompanies}
                    </SelectItem>
                  ) : (
                    organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : null}

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

          {mode === "company" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="fl-field">
                <label className="fl-field-label">{s.jobRole}</label>
                <Select
                  value={jobRoleId || null}
                  onValueChange={(v) => v && onJobRoleChange(v)}
                  disabled={loadingRoles || jobRoles.length === 0}
                >
                  <SelectTrigger className="fl-select-trigger fl-input w-full">
                    <SelectValue placeholder={s.selectJobRole}>
                      {loadingRoles
                        ? "…"
                        : (selectedJob?.name ?? s.selectJobRole)}
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
                    {COMPANY_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {dict.roles[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {mode === "company" && selectedJob ? (
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
            disabled={pending}
          >
            {dict.common.cancel}
          </button>
          <button
            type="button"
            className="fl-btn sm primary"
            onClick={handleSubmit}
            disabled={pending || !canSubmit}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
            ) : null}
            {d.createUser}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

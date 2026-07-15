"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Briefcase,
  FileText,
  Mail,
  Phone,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import type { TeamMemberOption } from "@/lib/team/members";
import type {
  EmployeeProfile,
  HrContractType,
  HrDepartment,
  HrEntry,
  HrEntryType,
  HrMemberStatus,
} from "@/lib/hr/types";
import { HR_ENTRY_TYPES } from "@/lib/hr/types";
import { CellMain } from "@/components/fusion/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type FormValues = {
  type: HrEntryType;
  date: string;
  leaveStart: string;
  leaveEnd: string;
  amount: string;
  currency: string;
  hours: string;
  minutes: string;
  note: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function leaveDaysInclusive(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : 0;
}

export function HrEntryFormDialog({
  open,
  onOpenChange,
  member,
  defaultType,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberOption | null;
  defaultType?: HrEntryType;
  onSave: (entry: HrEntry) => void;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      type: defaultType ?? "note",
      date: todayIso(),
      leaveStart: todayIso(),
      leaveEnd: todayIso(),
      amount: "",
      currency: "MAD",
      hours: "",
      minutes: "",
      note: "",
    },
  });

  const entryType = watch("type");

  useEffect(() => {
    if (open) {
      const today = todayIso();
      reset({
        type: defaultType ?? "note",
        date: today,
        leaveStart: today,
        leaveEnd: today,
        amount: "",
        currency: "MAD",
        hours: "",
        minutes: "",
        note: "",
      });
    }
  }, [open, defaultType, reset]);

  function onSubmit(values: FormValues) {
    if (!member) return;

    const entry: HrEntry = {
      id: crypto.randomUUID(),
      memberId: member.id,
      type: values.type,
      date: values.date,
      note: values.note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    if (values.type === "bonus" || values.type === "commission") {
      const amount = Number(values.amount);
      if (!amount || amount <= 0) {
        toast.error(h.amount);
        return;
      }
      entry.amount = amount;
      entry.currency = values.currency || "MAD";
    }

    if (values.type === "overtime") {
      const hours = Number(values.hours);
      if (!hours || hours <= 0) {
        toast.error(h.hours);
        return;
      }
      entry.hours = hours;
    }

    if (values.type === "leave") {
      const start = values.leaveStart;
      const end = values.leaveEnd;
      if (!start || !end) {
        toast.error(h.leaveStart);
        return;
      }
      if (end < start) {
        toast.error(h.leaveEndBeforeStart);
        return;
      }
      const days = leaveDaysInclusive(start, end);
      if (days <= 0) {
        toast.error(h.days);
        return;
      }
      entry.date = start;
      entry.endDate = end;
      entry.days = days;
    }

    if (values.type !== "leave") {
      entry.date = values.date;
    }

    if (values.type === "lateness") {
      if (!values.note.trim()) {
        toast.error(h.entryNote);
        return;
      }
      const minutes = Number(values.minutes);
      if (minutes > 0) entry.minutes = minutes;
    }

    if (values.type === "note" && !values.note.trim()) {
      toast.error(h.noteRequired);
      return;
    }

    onSave(entry);
    toast.success(h.createdEntry);
    onOpenChange(false);
  }

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-md">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>
            {h.addEntry} — {member.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="fl-dialog-body fl-form space-y-4">
          <div className="space-y-2">
            <Label>{h.entryType}</Label>
            <Select
              value={entryType}
              onValueChange={(v) => v && setValue("type", v as HrEntryType)}
            >
              <SelectTrigger className="fl-select-trigger fl-input w-full">
                <SelectValue placeholder={h.entryType}>{h[entryType]}</SelectValue>
              </SelectTrigger>
              <SelectContent className="fl-select-panel">
                {HR_ENTRY_TYPES.map((t) => (
                  <SelectItem key={t} value={t} label={h[t]}>
                    {h[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {entryType === "leave" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hr-leave-start">{h.leaveStart}</Label>
                <Input
                  id="hr-leave-start"
                  type="date"
                  className="fl-inp"
                  {...register("leaveStart", { required: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hr-leave-end">{h.leaveEnd}</Label>
                <Input
                  id="hr-leave-end"
                  type="date"
                  className="fl-inp"
                  {...register("leaveEnd", { required: true })}
                />
              </div>
              {watch("leaveStart") && watch("leaveEnd") && watch("leaveEnd") >= watch("leaveStart") ? (
                <p className="sm:col-span-2 text-[11px] fl-faint">
                  {h.leaveDurationHint.replace(
                    "{days}",
                    String(leaveDaysInclusive(watch("leaveStart"), watch("leaveEnd")))
                  )}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="hr-entry-date">{h.entryDate}</Label>
              <Input
                id="hr-entry-date"
                type="date"
                className="fl-inp"
                {...register("date", { required: true })}
              />
            </div>
          )}

          {(entryType === "bonus" || entryType === "commission") && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hr-amount">{h.amount}</Label>
                <Input id="hr-amount" type="number" min="0" step="0.01" className="fl-inp" {...register("amount")} />
              </div>
              <div className="space-y-2">
                <Label>{h.currency}</Label>
                <Select
                  value={watch("currency")}
                  onValueChange={(v) => v && setValue("currency", v)}
                >
                  <SelectTrigger className="fl-select-trigger fl-input w-full">
                    <SelectValue placeholder={h.currency}>{watch("currency")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="fl-select-panel">
                    <SelectItem value="MAD" label="MAD">MAD</SelectItem>
                    <SelectItem value="SAR" label="SAR">SAR</SelectItem>
                    <SelectItem value="EUR" label="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {entryType === "overtime" && (
            <div className="space-y-2">
              <Label htmlFor="hr-hours">{h.hours}</Label>
              <Input id="hr-hours" type="number" min="0.5" step="0.5" className="fl-inp" {...register("hours")} />
            </div>
          )}

          {entryType === "lateness" && (
            <div className="space-y-2">
              <Label htmlFor="hr-minutes">{h.minutesLate}</Label>
              <Input
                id="hr-minutes"
                type="number"
                min="1"
                step="1"
                className="fl-inp"
                placeholder={h.minutesLateHint}
                {...register("minutes")}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="hr-note">
              {entryType === "note" ? h.note : h.entryNote}
              {entryType === "note" ? " *" : ""}
            </Label>
            <Textarea
              id="hr-note"
              rows={3}
              className="fl-inp"
              placeholder={entryType === "note" ? h.notePlaceholder : undefined}
              {...register("note", {
                required: entryType === "note" ? h.noteRequired : false,
              })}
            />
            {errors.note && (
              <p className="text-xs text-destructive">{errors.note.message}</p>
            )}
          </div>

          <DialogFooter className="fl-dialog-footer gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {dict.common.cancel}
            </Button>
            <Button type="submit">
              {dict.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ProfileFormValues = {
  roleTitle: string;
  department: HrDepartment;
  phone: string;
  email: string;
  baseSalary: string;
  salaryCurrency: string;
  overtimeRate: string;
  contractType: HrContractType;
  utilization: string;
  status: HrMemberStatus;
  contractStart: string;
  contractEnd: string;
};

export function EmployeeProfileFormDialog({
  open,
  onOpenChange,
  profile,
  member,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: EmployeeProfile | null;
  member: TeamMemberOption | null;
  onSave: (profile: EmployeeProfile) => void;
}) {
  const dict = useDict();
  const h = dict.fusion.hr;
  const l = dict.fusion.labels;
  const s = dict.fusion.settings;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
  } = useForm<ProfileFormValues>({
    defaultValues: {
      roleTitle: "",
      department: "tech",
      phone: "",
      email: "",
      baseSalary: "",
      salaryCurrency: "MAD",
      overtimeRate: "",
      contractType: "core",
      utilization: "75",
      status: "active",
      contractStart: "",
      contractEnd: "",
    },
  });

  useEffect(() => {
    if (open && profile) {
      reset({
        roleTitle: profile.roleTitle,
        department: profile.department,
        phone: profile.phone || member?.phone || "",
        email: profile.email || member?.email || "",
        baseSalary:
          profile.baseSalary != null && profile.baseSalary > 0
            ? String(profile.baseSalary)
            : "",
        salaryCurrency: profile.salaryCurrency || "MAD",
        overtimeRate:
          profile.overtimeRate != null && profile.overtimeRate > 0
            ? String(profile.overtimeRate)
            : "",
        contractType: profile.contractType,
        utilization: String(profile.utilization),
        status: profile.status,
        contractStart: profile.contractStart ?? "",
        contractEnd: profile.contractEnd ?? "",
      });
    }
  }, [open, profile, member, reset]);

  function onSubmit(values: ProfileFormValues) {
    if (!profile) return;
    const salaryRaw = values.baseSalary.trim();
    const salary = salaryRaw === "" ? undefined : Number(salaryRaw);
    if (salaryRaw !== "" && (!Number.isFinite(salary) || (salary ?? 0) < 0)) {
      toast.error(h.baseSalary);
      return;
    }
    const otRaw = values.overtimeRate.trim();
    const overtimeRate = otRaw === "" ? undefined : Number(otRaw);
    if (otRaw !== "" && (!Number.isFinite(overtimeRate) || (overtimeRate ?? 0) < 0)) {
      toast.error(h.overtimeRate);
      return;
    }
    onSave({
      ...profile,
      roleTitle: values.roleTitle.trim() || profile.roleTitle,
      department: values.department,
      businessUnit: "",
      phone: values.phone.trim(),
      email: values.email.trim(),
      baseSalary: salary,
      salaryCurrency: values.salaryCurrency || "MAD",
      overtimeRate,
      contractType: values.contractType,
      utilization: Math.min(100, Math.max(0, Number(values.utilization) || 0)),
      status: values.status,
      contractStart: values.contractStart,
      contractEnd: values.contractEnd,
    });
    toast.success(h.updatedProfile);
    onOpenChange(false);
  }

  if (!profile || !member) return null;

  const utilizationValue = Number(watch("utilization")) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content fl-dialog-content--lg ring-0 sm:max-w-2xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl text-white shadow-sm"
              style={{ background: "var(--grad-brand)" }}
            >
              <UserRound className="size-5" strokeWidth={1.75} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span>{h.editProfile}</span>
              <span className="text-xs font-normal fl-faint">{h.editProfileSub}</span>
            </span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="fl-form">
          <div className="fl-dialog-body space-y-4">
            <div className="fl-hr-profile-dialog__hero">
              <CellMain
                initials={member.initials}
                gradient={`linear-gradient(135deg,${member.color},#71717a)`}
                title={member.name}
                sub={watch("roleTitle") || profile.roleTitle}
              />
            </div>

            <section className="fl-form-section">
              <div className="fl-form-section__head">
                <Briefcase className="size-3.5 text-[var(--iris)]" strokeWidth={1.75} />
                <h4>{h.profileIdentitySection}</h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="fl-field sm:col-span-2">
                  <label className="fl-field-label" htmlFor="hr-role">
                    {l.role}
                  </label>
                  <Input id="hr-role" className="fl-input" {...register("roleTitle")} />
                </div>
                <div className="fl-field">
                  <label className="fl-field-label">{h.department}</label>
                  <Select
                    value={watch("department")}
                    onValueChange={(v) => v && setValue("department", v as HrDepartment)}
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
                      <SelectValue placeholder={h.department}>
                        {h.departments[watch("department")]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel">
                      {(Object.keys(h.departments) as HrDepartment[]).map((d) => (
                        <SelectItem key={d} value={d} label={h.departments[d]}>
                          {h.departments[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="hr-util">
                    {l.utilization}
                  </label>
                  <div className="space-y-2">
                    <Input
                      id="hr-util"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      className="fl-hr-util-range w-full"
                      style={{ ["--util-pct" as string]: `${utilizationValue}%` }}
                      {...register("utilization")}
                    />
                    <div className="flex items-center justify-between text-[11px] fl-faint">
                      <span>0%</span>
                      <span className="fl-mono font-semibold text-[var(--text)]">
                        {utilizationValue}%
                      </span>
                      <span>100%</span>
                    </div>
                  </div>
                  <span className="fl-field-hint">{h.utilizationHint}</span>
                </div>
              </div>
            </section>

            <section className="fl-form-section">
              <div className="fl-form-section__head">
                <Phone className="size-3.5 text-[var(--iris)]" strokeWidth={1.75} />
                <h4>{h.contactSection}</h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="hr-phone">
                    {s.phone}
                  </label>
                  <div className="fl-input-affix">
                    <Phone className="fl-input-affix__icon size-4" strokeWidth={1.75} />
                    <Input
                      id="hr-phone"
                      type="tel"
                      className="fl-input fl-input--with-icon"
                      placeholder={s.phonePlaceholder}
                      {...register("phone")}
                    />
                  </div>
                </div>
                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="hr-email">
                    {h.email}
                  </label>
                  <div className="fl-input-affix">
                    <Mail className="fl-input-affix__icon size-4" strokeWidth={1.75} />
                    <Input
                      id="hr-email"
                      type="email"
                      className="fl-input fl-input--with-icon"
                      placeholder="nom@entreprise.com"
                      {...register("email")}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="fl-form-section">
              <div className="fl-form-section__head">
                <Wallet className="size-3.5 text-[var(--iris)]" strokeWidth={1.75} />
                <h4>{h.payrollSection}</h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="hr-salary">
                    {h.baseSalary}
                  </label>
                  <Input
                    id="hr-salary"
                    type="number"
                    min="0"
                    step="100"
                    className="fl-input fl-mono"
                    placeholder="0"
                    {...register("baseSalary")}
                  />
                  <span className="fl-field-hint">{h.baseSalaryHint}</span>
                </div>
                <div className="fl-field">
                  <label className="fl-field-label">{h.currency}</label>
                  <Select
                    value={watch("salaryCurrency")}
                    onValueChange={(v) => v && setValue("salaryCurrency", v)}
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
                      <SelectValue placeholder={h.currency}>
                        {watch("salaryCurrency")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel">
                      <SelectItem value="MAD" label="MAD">MAD</SelectItem>
                      <SelectItem value="SAR" label="SAR">SAR</SelectItem>
                      <SelectItem value="EUR" label="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="fl-field sm:col-span-2">
                  <label className="fl-field-label" htmlFor="hr-ot-rate">
                    {h.overtimeRate}
                  </label>
                  <Input
                    id="hr-ot-rate"
                    type="number"
                    min="0"
                    step="1"
                    className="fl-input fl-mono"
                    placeholder="0"
                    {...register("overtimeRate")}
                  />
                  <span className="fl-field-hint">{h.overtimeRateHint}</span>
                </div>
              </div>
            </section>

            <section className="fl-form-section">
              <div className="fl-form-section__head">
                <FileText className="size-3.5 text-[var(--iris)]" strokeWidth={1.75} />
                <h4>{h.profileContractSection}</h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="fl-field">
                  <label className="fl-field-label">{h.contractType}</label>
                  <Select
                    value={watch("contractType")}
                    onValueChange={(v) => v && setValue("contractType", v as HrContractType)}
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
                      <SelectValue placeholder={h.contractType}>
                        {h.contracts[watch("contractType")]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel">
                      {(Object.keys(h.contracts) as HrContractType[]).map((c) => (
                        <SelectItem key={c} value={c} label={h.contracts[c]}>
                          {h.contracts[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="fl-field">
                  <label className="fl-field-label">{h.memberStatus}</label>
                  <Select
                    value={watch("status")}
                    onValueChange={(v) => v && setValue("status", v as HrMemberStatus)}
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
                      <SelectValue placeholder={h.memberStatus}>
                        {h.statuses[watch("status")]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel">
                      {(Object.keys(h.statuses) as HrMemberStatus[]).map((st) => (
                        <SelectItem key={st} value={st} label={h.statuses[st]}>
                          {h.statuses[st]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="hr-contract-start">
                    {h.contractStart}
                  </label>
                  <Input
                    id="hr-contract-start"
                    type="date"
                    className="fl-input"
                    {...register("contractStart")}
                  />
                </div>
                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="hr-contract-end">
                    {h.contractEnd}
                  </label>
                  <Input
                    id="hr-contract-end"
                    type="date"
                    className="fl-input"
                    {...register("contractEnd")}
                  />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="fl-dialog-footer gap-2 border-t border-[var(--border)] pt-4 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {dict.common.cancel}
            </Button>
            <Button type="submit">{dict.common.save}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
  amount: string;
  currency: string;
  hours: string;
  minutes: string;
  days: string;
  note: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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
      amount: "",
      currency: "MAD",
      hours: "",
      minutes: "",
      days: "",
      note: "",
    },
  });

  const entryType = watch("type");

  useEffect(() => {
    if (open) {
      reset({
        type: defaultType ?? "note",
        date: todayIso(),
        amount: "",
        currency: "MAD",
        hours: "",
        minutes: "",
        days: "",
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
      const days = Number(values.days);
      if (!days || days <= 0) {
        toast.error(h.days);
        return;
      }
      entry.days = days;
    }

    if (values.type === "lateness") {
      if (!values.note.trim()) {
        toast.error(h.entryNote);
        return;
      }
      const minutes = Number(values.minutes);
      if (minutes > 0) entry.minutes = minutes;
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
              <SelectTrigger className="fl-select-trigger w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="fl-select-panel">
                {HR_ENTRY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {h[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hr-entry-date">{h.entryDate}</Label>
            <Input id="hr-entry-date" type="date" className="fl-inp" {...register("date", { required: true })} />
          </div>

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
                  <SelectTrigger className="fl-select-trigger w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="fl-select-panel">
                    <SelectItem value="MAD">MAD</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
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

          {entryType === "leave" && (
            <div className="space-y-2">
              <Label htmlFor="hr-days">{h.days}</Label>
              <Input id="hr-days" type="number" min="0.5" step="0.5" className="fl-inp" {...register("days")} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="hr-note">{h.entryNote}</Label>
            <Textarea id="hr-note" rows={3} className="fl-inp" {...register("note")} />
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
  businessUnit: string;
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
      businessUnit: "",
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
        businessUnit: profile.businessUnit || "",
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
      businessUnit: values.businessUnit.trim(),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>
            {h.editProfile} — {member.name}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="fl-dialog-body fl-form max-h-[70vh] space-y-4 overflow-y-auto"
        >
          <div className="space-y-2">
            <Label htmlFor="hr-role">{l.role}</Label>
            <Input id="hr-role" className="fl-inp" {...register("roleTitle")} />
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-3 space-y-3">
            <p className="text-[12px] font-semibold tracking-wide text-[var(--text-dim)]">
              {h.contactSection}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hr-phone">{s.phone}</Label>
                <Input
                  id="hr-phone"
                  type="tel"
                  className="fl-inp"
                  placeholder={s.phonePlaceholder}
                  {...register("phone")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hr-email">{h.email}</Label>
                <Input
                  id="hr-email"
                  type="email"
                  className="fl-inp"
                  placeholder="nom@entreprise.com"
                  {...register("email")}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{h.department}</Label>
              <Select
                value={watch("department")}
                onValueChange={(v) => v && setValue("department", v as HrDepartment)}
              >
                <SelectTrigger className="fl-select-trigger w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="fl-select-panel">
                  {(Object.keys(h.departments) as HrDepartment[]).map((d) => (
                    <SelectItem key={d} value={d}>
                      {h.departments[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hr-bu">{h.businessUnit}</Label>
              <Input
                id="hr-bu"
                className="fl-inp"
                placeholder={h.businessUnitPlaceholder}
                {...register("businessUnit")}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-3 space-y-3">
            <p className="text-[12px] font-semibold tracking-wide text-[var(--text-dim)]">
              {h.payrollSection}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hr-salary">{h.baseSalary}</Label>
                <Input
                  id="hr-salary"
                  type="number"
                  min="0"
                  step="100"
                  className="fl-inp"
                  placeholder="0"
                  {...register("baseSalary")}
                />
              </div>
              <div className="space-y-2">
                <Label>{h.currency}</Label>
                <Select
                  value={watch("salaryCurrency")}
                  onValueChange={(v) => v && setValue("salaryCurrency", v)}
                >
                  <SelectTrigger className="fl-select-trigger w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="fl-select-panel">
                    <SelectItem value="MAD">MAD</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hr-ot-rate">{h.overtimeRate}</Label>
              <Input
                id="hr-ot-rate"
                type="number"
                min="0"
                step="1"
                className="fl-inp"
                placeholder="0"
                {...register("overtimeRate")}
              />
              <p className="text-[11px] fl-faint">{h.overtimeRateHint}</p>
            </div>
            <p className="text-[11px] fl-faint">{h.baseSalaryHint}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{h.contractType}</Label>
              <Select
                value={watch("contractType")}
                onValueChange={(v) => v && setValue("contractType", v as HrContractType)}
              >
                <SelectTrigger className="fl-select-trigger w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="fl-select-panel">
                  {(Object.keys(h.contracts) as HrContractType[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {h.contracts[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{h.memberStatus}</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => v && setValue("status", v as HrMemberStatus)}
              >
                <SelectTrigger className="fl-select-trigger w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="fl-select-panel">
                  {(Object.keys(h.statuses) as HrMemberStatus[]).map((st) => (
                    <SelectItem key={st} value={st}>
                      {h.statuses[st]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hr-util">{l.utilization}</Label>
            <Input id="hr-util" type="number" min="0" max="100" className="fl-inp" {...register("utilization")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hr-contract-start">{h.contractStart}</Label>
              <Input
                id="hr-contract-start"
                type="date"
                className="fl-inp"
                {...register("contractStart")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hr-contract-end">{h.contractEnd}</Label>
              <Input
                id="hr-contract-end"
                type="date"
                className="fl-inp"
                {...register("contractEnd")}
              />
            </div>
          </div>
          <DialogFooter className="fl-dialog-footer gap-2 sm:gap-0">
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

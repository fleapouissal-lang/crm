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
        days: "",
        note: "",
      });
    }
  }, [open, defaultType, reset]);

  function onSubmit(values: FormValues) {
    if (!member) return;

    const entry: HrEntry = {
      id: `hr-${Date.now()}`,
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

    if (values.type === "lateness" && !values.note.trim()) {
      toast.error(h.entryNote);
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
  } = useForm({
    defaultValues: {
      roleTitle: "",
      department: "tech" as HrDepartment,
      contractType: "core" as HrContractType,
      utilization: "75",
      status: "active" as HrMemberStatus,
      contractStart: "",
      contractEnd: "",
    },
  });

  useEffect(() => {
    if (open && profile) {
      reset({
        roleTitle: profile.roleTitle,
        department: profile.department,
        contractType: profile.contractType,
        utilization: String(profile.utilization),
        status: profile.status,
        contractStart: profile.contractStart ?? "",
        contractEnd: profile.contractEnd ?? "",
      });
    }
  }, [open, profile, reset]);

  function onSubmit(values: {
    roleTitle: string;
    department: HrDepartment;
    contractType: HrContractType;
    utilization: string;
    status: HrMemberStatus;
    contractStart: string;
    contractEnd: string;
  }) {
    if (!profile) return;
    onSave({
      ...profile,
      roleTitle: values.roleTitle.trim() || profile.roleTitle,
      department: values.department,
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
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-md">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>
            {h.editProfile} — {member.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="fl-dialog-body fl-form space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hr-role">{l.role}</Label>
            <Input id="hr-role" className="fl-inp" {...register("roleTitle")} />
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
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hr-util">{l.utilization}</Label>
              <Input id="hr-util" type="number" min="0" max="100" className="fl-inp" {...register("utilization")} />
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
                  {(Object.keys(h.statuses) as HrMemberStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {h.statuses[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

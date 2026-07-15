"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  Loader2,
  Mail,
  Phone,
  Target,
  TrendingUp,
  User,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { leadSchema, type LeadFormValues } from "@/lib/validations/lead";
import { createLead, updateLead } from "@/lib/actions/leads";
import type { Lead, Profile } from "@/types/database";
import { LEAD_STAGES } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  profiles: Profile[];
}

function profileLabel(p: Profile) {
  return p.full_name?.trim() || p.email || "—";
}

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  profiles,
}: LeadFormDialogProps) {
  const dict = useDict();
  const l = dict.leads;
  const c = dict.common;
  const [pending, startTransition] = useTransition();
  const isEdit = !!lead;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      title: "",
      company: "",
      contact_name: "",
      email: "",
      phone: "",
      value: 0,
      stage: "new",
      notes: "",
      assigned_to: "",
    },
  });

  const stage = watch("stage");
  const assignedTo = watch("assigned_to") || "unassigned";
  const assignedProfile = profiles.find((p) => p.id === assignedTo);

  useEffect(() => {
    if (open) {
      reset({
        title: lead?.title ?? "",
        company: lead?.company ?? "",
        contact_name: lead?.contact_name ?? "",
        email: lead?.email ?? "",
        phone: lead?.phone ?? "",
        value: Number(lead?.value ?? 0),
        stage: lead?.stage ?? "new",
        notes: lead?.notes ?? "",
        assigned_to: lead?.assigned_to ?? "",
      });
    }
  }, [open, lead, reset]);

  function onSubmit(values: LeadFormValues) {
    startTransition(async () => {
      const result = isEdit
        ? await updateLead(lead!.id, values)
        : await createLead(values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? l.updatedLead : l.createdLead);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content fl-dialog-content--lg ring-0 sm:max-w-2xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl text-white shadow-sm"
              style={{ background: "var(--grad-brand)" }}
            >
              <Target className="size-5" strokeWidth={1.75} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span>{isEdit ? l.editLead : l.newLead}</span>
              <span className="text-xs font-normal fl-faint">
                {isEdit ? l.editLeadSub : l.newLeadSub}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="fl-form">
          <div className="fl-dialog-body space-y-4">
            <section className="fl-form-section">
              <div className="fl-form-section__head">
                <Briefcase className="size-3.5 text-[var(--iris)]" strokeWidth={1.75} />
                <h4>{l.leadDealSection}</h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="fl-field sm:col-span-2">
                  <label className="fl-field-label" htmlFor="lead-title">
                    {c.title} *
                  </label>
                  <Input
                    id="lead-title"
                    className="fl-input"
                    placeholder={l.leadTitlePlaceholder}
                    {...register("title")}
                  />
                  {errors.title ? (
                    <span className="fl-field-hint text-[var(--rose)]">
                      {errors.title.message}
                    </span>
                  ) : null}
                </div>
                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="lead-company">
                    {c.company}
                  </label>
                  <Input
                    id="lead-company"
                    className="fl-input"
                    placeholder={l.leadCompanyPlaceholder}
                    {...register("company")}
                  />
                </div>
                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="lead-value">
                    {c.value}
                  </label>
                  <div className="fl-input-affix">
                    <TrendingUp
                      className="fl-input-affix__icon size-4"
                      strokeWidth={1.75}
                    />
                    <Input
                      id="lead-value"
                      type="number"
                      min={0}
                      step={1}
                      className="fl-input fl-input--with-icon fl-mono"
                      placeholder="0"
                      {...register("value", { valueAsNumber: true })}
                    />
                  </div>
                  <span className="fl-field-hint">{l.valueHint}</span>
                </div>
              </div>
            </section>

            <section className="fl-form-section">
              <div className="fl-form-section__head">
                <User className="size-3.5 text-[var(--iris)]" strokeWidth={1.75} />
                <h4>{l.leadContactSection}</h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="fl-field sm:col-span-2">
                  <label className="fl-field-label" htmlFor="lead-contact">
                    {c.contact}
                  </label>
                  <Input
                    id="lead-contact"
                    className="fl-input"
                    placeholder={l.leadContactPlaceholder}
                    {...register("contact_name")}
                  />
                </div>
                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="lead-email">
                    {c.email}
                  </label>
                  <div className="fl-input-affix">
                    <Mail className="fl-input-affix__icon size-4" strokeWidth={1.75} />
                    <Input
                      id="lead-email"
                      type="email"
                      className="fl-input fl-input--with-icon"
                      placeholder="contact@entreprise.com"
                      {...register("email")}
                    />
                  </div>
                  {errors.email ? (
                    <span className="fl-field-hint text-[var(--rose)]">
                      {errors.email.message}
                    </span>
                  ) : null}
                </div>
                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="lead-phone">
                    {c.phone}
                  </label>
                  <div className="fl-input-affix">
                    <Phone className="fl-input-affix__icon size-4" strokeWidth={1.75} />
                    <Input
                      id="lead-phone"
                      type="tel"
                      className="fl-input fl-input--with-icon"
                      placeholder="+212 6…"
                      {...register("phone")}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="fl-form-section">
              <div className="fl-form-section__head">
                <Target className="size-3.5 text-[var(--iris)]" strokeWidth={1.75} />
                <h4>{l.leadPipelineSection}</h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="fl-field">
                  <label className="fl-field-label">{c.stage}</label>
                  <Select
                    value={stage}
                    onValueChange={(v) =>
                      v && setValue("stage", v as LeadFormValues["stage"])
                    }
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
                      <SelectValue placeholder={c.stage}>
                        {dict.stages[stage]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel">
                      {LEAD_STAGES.map((s) => (
                        <SelectItem key={s} value={s} label={dict.stages[s]}>
                          {dict.stages[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="fl-field">
                  <label className="fl-field-label">{c.assignedTo}</label>
                  <Select
                    value={assignedTo}
                    onValueChange={(v) =>
                      setValue("assigned_to", v === "unassigned" ? "" : v)
                    }
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
                      <SelectValue placeholder={c.unassigned}>
                        {assignedTo === "unassigned"
                          ? c.unassigned
                          : assignedProfile
                            ? profileLabel(assignedProfile)
                            : c.unassigned}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel">
                      <SelectItem value="unassigned" label={c.unassigned}>
                        {c.unassigned}
                      </SelectItem>
                      {profiles.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                          label={profileLabel(p)}
                        >
                          {profileLabel(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="fl-field sm:col-span-2">
                  <label className="fl-field-label" htmlFor="lead-notes">
                    {c.notes}
                  </label>
                  <Textarea
                    id="lead-notes"
                    rows={3}
                    className="fl-input min-h-[5.5rem]"
                    placeholder={l.notesPlaceholder}
                    {...register("notes")}
                  />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="fl-dialog-footer gap-2 border-t border-[var(--border)] pt-4 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {c.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {isEdit ? c.save : l.createLead}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

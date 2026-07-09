"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { leadSchema, type LeadFormValues } from "@/lib/validations/lead";
import { createLead, updateLead } from "@/lib/actions/leads";
import type { Lead, Profile } from "@/types/database";
import { LEAD_STAGES } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
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

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  profiles: Profile[];
}

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  profiles,
}: LeadFormDialogProps) {
  const dict = useDict();
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

      toast.success(isEdit ? dict.leads.updatedLead : dict.leads.createdLead);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? dict.leads.editLead : dict.leads.newLead}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{dict.common.title} *</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">{dict.common.company}</Label>
              <Input id="company" {...register("company")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">{dict.common.contact}</Label>
              <Input id="contact_name" {...register("contact_name")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">{dict.common.email}</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{dict.common.phone}</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="value">{dict.common.value} ($)</Label>
              <Input
                id="value"
                type="number"
                min={0}
                step={1}
                {...register("value", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>{dict.common.stage}</Label>
              <Select
                value={watch("stage")}
                onValueChange={(v) =>
                  v && setValue("stage", v as LeadFormValues["stage"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {dict.stages[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{dict.common.assignedTo}</Label>
            <Select
              value={watch("assigned_to") || "unassigned"}
              onValueChange={(v) =>
                setValue("assigned_to", v === "unassigned" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={dict.common.unassigned} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">{dict.common.unassigned}</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">{dict.common.notes}</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {dict.common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? dict.common.save : dict.leads.createLead}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

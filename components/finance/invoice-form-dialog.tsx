"use client";

import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import type { DocumentTemplate, InvoiceRecord, InvoiceStatus } from "@/lib/finance/types";
import { nextInvoiceNumber } from "@/lib/finance/types";
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
import { cn } from "@/lib/utils";

const STATUSES: InvoiceStatus[] = ["draft", "pending", "paid", "overdue"];

const schema = z.object({
  clientName: z.string().min(1),
  amount: z.string().min(1),
  currency: z.string().min(1),
  dueDate: z.string().min(1),
  status: z.string(),
  templateId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function Field({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("fl-field", className)}>
      <label className="fl-field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  invoice,
  templates,
  existingInvoices,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: InvoiceRecord | null;
  templates: DocumentTemplate[];
  existingInvoices: InvoiceRecord[];
  onSave: (record: InvoiceRecord) => void;
}) {
  const dict = useDict();
  const inv = dict.fusion.invoices;
  const f = dict.fusion.financeDocs;
  const isEdit = Boolean(invoice?.id);

  const invoiceTemplates = templates.filter((t) => t.kind === "invoice");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientName: "",
      amount: "",
      currency: "MAD",
      dueDate: "",
      status: "draft",
      templateId: "",
      notes: "",
    },
  });

  const status = watch("status");
  const templateId = watch("templateId");

  useEffect(() => {
    if (!open) return;
    reset({
      clientName: invoice?.clientName ?? "",
      amount: invoice ? String(invoice.amount) : "",
      currency: invoice?.currency ?? "MAD",
      dueDate: invoice?.dueDate ?? "",
      status: invoice?.status ?? "draft",
      templateId: invoice?.templateId ?? invoiceTemplates[0]?.id ?? "",
      notes: invoice?.notes ?? "",
    });
  }, [open, invoice, reset, invoiceTemplates]);

  function onSubmit(values: FormValues) {
    const now = new Date().toISOString();
    const id = invoice?.id ?? `inv-${crypto.randomUUID().slice(0, 8)}`;
    const number = invoice?.number ?? nextInvoiceNumber(existingInvoices);
    onSave({
      id,
      number,
      clientName: values.clientName.trim(),
      amount: Number(values.amount.replace(/,/g, "")),
      currency: values.currency,
      dueDate: values.dueDate,
      status: values.status as InvoiceStatus,
      templateId: values.templateId || null,
      quoteId: invoice?.quoteId ?? null,
      notes: values.notes?.trim() ?? "",
      createdAt: invoice?.createdAt ?? now,
      updatedAt: now,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{isEdit ? f.editInvoice : inv.newInvoice}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="fl-dialog-body space-y-4">
          {isEdit ? (
            <p className="text-sm text-muted-foreground">
              {inv.number}{" "}
              <span className="fl-mono font-medium text-foreground">{invoice?.number}</span>
            </p>
          ) : null}
          <Field label={inv.client} htmlFor="inv-client" error={errors.clientName?.message}>
            <Input id="inv-client" className="fl-inp" {...register("clientName")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={inv.amount} htmlFor="inv-amount" error={errors.amount?.message}>
              <Input id="inv-amount" className="fl-inp" {...register("amount")} />
            </Field>
            <Field label={f.currency} htmlFor="inv-currency">
              <Input id="inv-currency" className="fl-inp" {...register("currency")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={inv.dueDate} htmlFor="inv-due" error={errors.dueDate?.message}>
              <Input id="inv-due" type="date" className="fl-inp" {...register("dueDate")} />
            </Field>
            <Field label={inv.status}>
              <Select value={status} onValueChange={(v) => v && setValue("status", v)}>
                <SelectTrigger className="fl-inp h-auto w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "overdue" ? inv.overdueStatus : inv[s as keyof typeof inv] as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={f.applyTemplate}>
            <Select
              value={templateId || "none"}
              onValueChange={(v) => setValue("templateId", !v || v === "none" ? "" : v)}
            >
              <SelectTrigger className="fl-inp h-auto w-full">
                <SelectValue placeholder={f.noTemplate} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{f.noTemplate}</SelectItem>
                {invoiceTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={dict.common.notes} htmlFor="inv-notes">
            <Textarea id="inv-notes" className="fl-inp min-h-[80px]" {...register("notes")} />
          </Field>
          <DialogFooter className="fl-dialog-footer">
            <button type="button" className="fl-btn sm ghost" onClick={() => onOpenChange(false)}>
              {dict.common.cancel}
            </button>
            <button type="submit" className="fl-btn sm primary" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {dict.common.save}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

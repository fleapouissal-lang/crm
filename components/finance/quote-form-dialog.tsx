"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import type { DocumentTemplate, QuoteRecord, QuoteStatus } from "@/lib/finance/types";
import { nextQuoteNumber } from "@/lib/finance/types";
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

const STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "expired", "refused"];

const schema = z.object({
  clientName: z.string().min(1),
  service: z.string().min(1),
  amount: z.string().min(1),
  currency: z.string().min(1),
  validityDays: z.string().min(1),
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

export function QuoteFormDialog({
  open,
  onOpenChange,
  quote,
  templates,
  existingQuotes,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: QuoteRecord | null;
  templates: DocumentTemplate[];
  existingQuotes: QuoteRecord[];
  onSave: (record: QuoteRecord) => void;
}) {
  const dict = useDict();
  const q = dict.fusion.quotes;
  const f = dict.fusion.financeDocs;
  const isEdit = Boolean(quote?.id);

  const quoteTemplates = useMemo(
    () => templates.filter((t) => t.kind === "quote"),
    [templates]
  );

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
      service: "",
      amount: "",
      currency: "MAD",
      validityDays: "30",
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
      clientName: quote?.clientName ?? "",
      service: quote?.service ?? "",
      amount: quote ? String(quote.amount) : "",
      currency: quote?.currency ?? "MAD",
      validityDays: quote ? String(quote.validityDays) : "30",
      status: quote?.status ?? "draft",
      templateId: quote?.templateId ?? quoteTemplates[0]?.id ?? "",
      notes: quote?.notes ?? "",
    });
  }, [open, quote, reset, quoteTemplates]);

  function onSubmit(values: FormValues) {
    const now = new Date().toISOString();
    const id = quote?.id ?? `q-${crypto.randomUUID().slice(0, 8)}`;
    const number = quote?.number ?? nextQuoteNumber(existingQuotes);
    onSave({
      id,
      number,
      clientName: values.clientName.trim(),
      service: values.service.trim(),
      amount: Number(values.amount.replace(/,/g, "")),
      currency: values.currency,
      validityDays: Number(values.validityDays),
      status: values.status as QuoteStatus,
      templateId: values.templateId || null,
      notes: values.notes?.trim() ?? "",
      createdAt: quote?.createdAt ?? now,
      updatedAt: now,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{isEdit ? f.editQuote : q.newQuote}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="fl-dialog-body space-y-4">
          {isEdit ? (
            <p className="text-sm text-muted-foreground">
              {q.reference} <span className="fl-mono font-medium text-foreground">{quote?.number}</span>
            </p>
          ) : null}
          <Field label={q.client} htmlFor="q-client" error={errors.clientName?.message}>
            <Input id="q-client" className="fl-inp" {...register("clientName")} />
          </Field>
          <Field label={q.service} htmlFor="q-service" error={errors.service?.message}>
            <Input id="q-service" className="fl-inp" {...register("service")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={q.amount} htmlFor="q-amount" error={errors.amount?.message}>
              <Input id="q-amount" className="fl-inp" {...register("amount")} />
            </Field>
            <Field label={f.currency} htmlFor="q-currency">
              <Input id="q-currency" className="fl-inp" {...register("currency")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={q.validity} htmlFor="q-validity" error={errors.validityDays?.message}>
              <Input id="q-validity" className="fl-inp" {...register("validityDays")} />
            </Field>
            <Field label={q.status}>
              <Select value={status} onValueChange={(v) => v && setValue("status", v)}>
                <SelectTrigger className="fl-inp h-auto w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {q[s]}
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
                {quoteTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={dict.common.notes} htmlFor="q-notes">
            <Textarea id="q-notes" className="fl-inp min-h-[80px]" {...register("notes")} />
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

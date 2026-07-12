"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { LineItemsEditor } from "@/components/finance/line-items-editor";
import type {
  ClientType,
  DocumentTemplate,
  FinanceLineItem,
  InvoiceRecord,
  InvoiceStatus,
} from "@/lib/finance/types";
import {
  createEmptyLineItem,
  documentAmountTtc,
  nextInvoiceNumber,
} from "@/lib/finance/types";
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
const CLIENT_TYPES: ClientType[] = ["pro", "particulier"];

const schema = z.object({
  clientName: z.string().min(1),
  clientType: z.enum(["pro", "particulier"]),
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
  const [items, setItems] = useState<FinanceLineItem[]>([createEmptyLineItem()]);
  const [linesError, setLinesError] = useState<string | null>(null);

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
      clientType: "pro",
      currency: "MAD",
      dueDate: "",
      status: "draft",
      templateId: "",
      notes: "",
    },
  });

  const status = watch("status");
  const templateId = watch("templateId");
  const clientType = watch("clientType");
  const currency = watch("currency") || "MAD";

  useEffect(() => {
    if (!open) return;
    reset({
      clientName: invoice?.clientName ?? "",
      clientType: invoice?.clientType ?? "pro",
      currency: invoice?.currency ?? "MAD",
      dueDate: invoice?.dueDate ?? "",
      status: invoice?.status ?? "draft",
      templateId: invoice?.templateId ?? invoiceTemplates[0]?.id ?? "",
      notes: invoice?.notes ?? "",
    });
    setItems(
      invoice?.items?.length
        ? invoice.items.map((row) => ({ ...row }))
        : [
            createEmptyLineItem({
              description: invoice?.notes || "Prestation",
              unitPriceTtc: invoice?.amount ?? 0,
            }),
          ]
    );
    setLinesError(null);
  }, [open, invoice, reset, invoiceTemplates]);

  function statusLabel(key: string) {
    if (key === "overdue") return inv.overdueStatus;
    return inv[key as keyof typeof inv] as string;
  }

  function onSubmit(values: FormValues) {
    const validItems = items.filter(
      (row) =>
        row.description.trim() &&
        (Number(row.quantity) || 0) > 0 &&
        (Number(row.unitPriceTtc) || 0) > 0
    );
    if (validItems.length === 0) {
      setLinesError(f.linesRequired);
      return;
    }
    setLinesError(null);

    const now = new Date().toISOString();
    const id = invoice?.id ?? `inv-${crypto.randomUUID().slice(0, 8)}`;
    const number = invoice?.number ?? nextInvoiceNumber(existingInvoices);
    const cleaned = validItems.map((row) => ({
      ...row,
      description: row.description.trim(),
      quantity: Number(row.quantity) || 1,
      unitPriceTtc: Number(row.unitPriceTtc) || 0,
    }));

    onSave({
      id,
      number,
      clientName: values.clientName.trim(),
      clientType: values.clientType as ClientType,
      amount: documentAmountTtc(cleaned),
      currency: values.currency,
      dueDate: values.dueDate,
      status: values.status as InvoiceStatus,
      templateId: values.templateId || null,
      quoteId: invoice?.quoteId ?? null,
      notes: values.notes?.trim() ?? "",
      items: cleaned,
      createdAt: invoice?.createdAt ?? now,
      updatedAt: now,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-2xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{isEdit ? f.editInvoice : inv.newInvoice}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="fl-dialog-body max-h-[70vh] space-y-4 overflow-y-auto"
        >
          {isEdit ? (
            <p className="text-sm text-muted-foreground">
              {inv.number}{" "}
              <span className="fl-mono font-medium text-foreground">
                {invoice?.number}
              </span>
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={inv.client}
              htmlFor="inv-client"
              error={errors.clientName?.message}
            >
              <Input
                id="inv-client"
                className="fl-inp"
                {...register("clientName")}
              />
            </Field>
            <Field label={f.clientType}>
              <Select
                value={clientType}
                onValueChange={(v) =>
                  v && setValue("clientType", v as ClientType)
                }
              >
                <SelectTrigger className="fl-inp h-auto w-full">
                  <SelectValue>
                    {
                      f[
                        clientType === "pro" ? "clientPro" : "clientParticulier"
                      ]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {f[type === "pro" ? "clientPro" : "clientParticulier"]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={f.currency} htmlFor="inv-currency">
              <Input
                id="inv-currency"
                className="fl-inp"
                {...register("currency")}
              />
            </Field>
            <Field
              label={inv.dueDate}
              htmlFor="inv-due"
              error={errors.dueDate?.message}
            >
              <Input
                id="inv-due"
                type="date"
                className="fl-inp"
                {...register("dueDate")}
              />
            </Field>
            <Field label={inv.status}>
              <Select
                value={status}
                onValueChange={(v) => v && setValue("status", v)}
              >
                <SelectTrigger className="fl-inp h-auto w-full">
                  <SelectValue>{statusLabel(status)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={f.applyTemplate}>
            <Select
              value={templateId || "none"}
              onValueChange={(v) =>
                setValue("templateId", !v || v === "none" ? "" : v)
              }
            >
              <SelectTrigger className="fl-inp h-auto w-full">
                <SelectValue>
                  {templateId
                    ? invoiceTemplates.find((t) => t.id === templateId)?.name ??
                      f.noTemplate
                    : f.noTemplate}
                </SelectValue>
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

          <LineItemsEditor
            items={items}
            currency={currency}
            onChange={setItems}
            error={linesError ?? undefined}
          />

          <Field label={dict.common.notes} htmlFor="inv-notes">
            <Textarea
              id="inv-notes"
              className="fl-inp min-h-[80px]"
              {...register("notes")}
            />
          </Field>
          <DialogFooter className="fl-dialog-footer">
            <button
              type="button"
              className="fl-btn sm ghost"
              onClick={() => onOpenChange(false)}
            >
              {dict.common.cancel}
            </button>
            <button
              type="submit"
              className="fl-btn sm primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {dict.common.save}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { FinanceDocumentEditor } from "@/components/finance/finance-document-editor";
import type {
  ClientType,
  DocumentTemplate,
  FinanceLineItem,
  InvoiceRecord,
  InvoiceStatus,
} from "@/lib/finance/types";
import {
  INVOICE_STATUS_BADGE,
  createEmptyLineItem,
  documentAmountTtc,
  nextInvoiceNumber,
} from "@/lib/finance/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUSES: InvoiceStatus[] = ["draft", "pending", "paid", "overdue"];

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

  const invoiceTemplates = useMemo(
    () => templates.filter((t) => t.kind === "invoice"),
    [templates]
  );

  const {
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

  const status = watch("status") as InvoiceStatus;
  const templateId = watch("templateId") || "";
  const clientType = watch("clientType");
  const currency = watch("currency") || "MAD";
  const clientName = watch("clientName") || "";
  const dueDate = watch("dueDate") || "";
  const notes = watch("notes") || "";
  const number = invoice?.number ?? nextInvoiceNumber(existingInvoices);

  useEffect(() => {
    if (!open) return;
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 30);
    reset({
      clientName: invoice?.clientName ?? "",
      clientType: invoice?.clientType ?? "pro",
      currency: invoice?.currency ?? "MAD",
      dueDate:
        invoice?.dueDate ?? defaultDue.toISOString().slice(0, 10),
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
      <DialogContent className="fl-dialog-content fl-dialog-content--doc ring-0 max-h-[96vh]">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{isEdit ? f.editInvoice : inv.newInvoice}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="fl-dialog-body max-h-[min(78vh,880px)] space-y-0 overflow-y-auto px-4 py-3 sm:px-5">
            <FinanceDocumentEditor
              kind="invoice"
              number={number}
              statusFieldLabel={inv.status}
              statusBadge={INVOICE_STATUS_BADGE[status] ?? "b-gray"}
              status={status}
              statusOptions={STATUSES.map((s) => ({
                value: s,
                label: statusLabel(s),
              }))}
              onStatusChange={(v) =>
                setValue("status", v, { shouldValidate: true })
              }
              clientName={clientName}
              onClientNameChange={(v) =>
                setValue("clientName", v, { shouldValidate: true })
              }
              clientNameError={
                errors.clientName ? f.previewClient : undefined
              }
              clientType={clientType}
              onClientTypeChange={(v) =>
                setValue("clientType", v, { shouldValidate: true })
              }
              currency={currency}
              onCurrencyChange={(v) =>
                setValue("currency", v, { shouldValidate: true })
              }
              templateId={templateId}
              templates={invoiceTemplates}
              onTemplateChange={(v) => setValue("templateId", v)}
              metaFields={[
                {
                  key: "dueDate",
                  label: inv.dueDate,
                  kind: "date",
                  value: dueDate,
                  onChange: (v) =>
                    setValue("dueDate", v, { shouldValidate: true }),
                  error: errors.dueDate ? inv.dueDate : undefined,
                },
              ]}
              items={items}
              onItemsChange={setItems}
              notes={notes}
              onNotesChange={(v) => setValue("notes", v)}
              linesError={linesError ?? undefined}
            />
          </div>

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

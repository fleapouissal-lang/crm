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
  QuoteRecord,
  QuoteStatus,
} from "@/lib/finance/types";
import {
  QUOTE_STATUS_BADGE,
  createEmptyLineItem,
  documentAmountTtc,
  nextQuoteNumber,
  summarizeService,
} from "@/lib/finance/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUSES: QuoteStatus[] = [
  "draft",
  "sent",
  "accepted",
  "expired",
  "refused",
];

const schema = z.object({
  clientName: z.string().min(1),
  clientType: z.enum(["pro", "particulier"]),
  currency: z.string().min(1),
  validityDays: z
    .string()
    .min(1)
    .refine((v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 365;
    }),
  status: z.string(),
  templateId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

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
  const [items, setItems] = useState<FinanceLineItem[]>([createEmptyLineItem()]);
  const [linesError, setLinesError] = useState<string | null>(null);

  const quoteTemplates = useMemo(
    () => templates.filter((t) => t.kind === "quote"),
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
      validityDays: "30",
      status: "draft",
      templateId: "",
      notes: "",
    },
  });

  const status = watch("status") as QuoteStatus;
  const templateId = watch("templateId") || "";
  const clientType = watch("clientType");
  const currency = watch("currency") || "MAD";
  const clientName = watch("clientName") || "";
  const validityDays = watch("validityDays") || "30";
  const notes = watch("notes") || "";
  const number = quote?.number ?? nextQuoteNumber(existingQuotes);

  useEffect(() => {
    if (!open) return;
    reset({
      clientName: quote?.clientName ?? "",
      clientType: quote?.clientType ?? "pro",
      currency: quote?.currency ?? "MAD",
      validityDays: quote ? String(quote.validityDays) : "30",
      status: quote?.status ?? "draft",
      templateId: quote?.templateId ?? quoteTemplates[0]?.id ?? "",
      notes: quote?.notes ?? "",
    });
    setItems(
      quote?.items?.length
        ? quote.items.map((row) => ({ ...row }))
        : [
            createEmptyLineItem({
              description: quote?.service ?? "",
              unitPriceTtc: quote?.amount ?? 0,
            }),
          ]
    );
    setLinesError(null);
  }, [open, quote, reset, quoteTemplates]);

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
    const id = quote?.id ?? `q-${crypto.randomUUID().slice(0, 8)}`;
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
      service: summarizeService(cleaned),
      amount: documentAmountTtc(cleaned),
      currency: values.currency,
      validityDays: Number(values.validityDays),
      status: values.status as QuoteStatus,
      templateId: values.templateId || null,
      notes: values.notes?.trim() ?? "",
      items: cleaned,
      createdAt: quote?.createdAt ?? now,
      updatedAt: now,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content fl-dialog-content--doc ring-0 max-h-[96vh]">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{isEdit ? f.editQuote : q.newQuote}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="fl-dialog-body max-h-[min(78vh,880px)] space-y-0 overflow-y-auto px-4 py-3 sm:px-5">
            <FinanceDocumentEditor
              kind="quote"
              number={number}
              statusFieldLabel={q.status}
              statusBadge={QUOTE_STATUS_BADGE[status] ?? "b-gray"}
              status={status}
              statusOptions={STATUSES.map((s) => ({
                value: s,
                label: q[s],
              }))}
              onStatusChange={(v) =>
                setValue("status", v, { shouldValidate: true })
              }
              clientName={clientName}
              onClientNameChange={(v) =>
                setValue("clientName", v, { shouldValidate: true })
              }
              clientNameError={errors.clientName ? q.client : undefined}
              clientType={clientType}
              onClientTypeChange={(v) =>
                setValue("clientType", v, { shouldValidate: true })
              }
              currency={currency}
              onCurrencyChange={(v) =>
                setValue("currency", v, { shouldValidate: true })
              }
              templateId={templateId}
              templates={quoteTemplates}
              onTemplateChange={(v) => setValue("templateId", v)}
              metaFields={[
                {
                  key: "validity",
                  label: q.validity,
                  kind: "number",
                  value: validityDays,
                  min: 1,
                  max: 365,
                  onChange: (v) =>
                    setValue("validityDays", v, { shouldValidate: true }),
                  error: errors.validityDays
                    ? q.validityDaysUnit.replace("{n}", "1–365")
                    : undefined,
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

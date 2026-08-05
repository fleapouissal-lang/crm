"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { FinanceDocumentEditor } from "@/components/finance/finance-document-editor";
import { FinanceDocumentOptions } from "@/components/finance/finance-document-options";
import {
  QUOTE_STATUS_BADGE,
  createEmptyLineItem,
  documentAmountTtc,
  summarizeService,
  type ClientDetails,
  type ClientType,
  type FinanceLineItem,
  type QuoteRecord,
  type QuoteStatus,
} from "@/lib/finance/types";
import { upsertQuote } from "@/lib/actions/finance-docs";

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
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function EditQuotePageClient({ quote }: { quote: QuoteRecord }) {
  const dict = useDict();
  const router = useRouter();
  const q = dict.fusion.quotes;
  const f = dict.fusion.financeDocs;
  const [items, setItems] = useState<FinanceLineItem[]>(
    quote.items?.length
      ? quote.items.map((row) => ({ ...row }))
      : [createEmptyLineItem()]
  );
  const [linesError, setLinesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clientDetails, setClientDetails] = useState<ClientDetails>(
    quote.clientDetails ?? {}
  );

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientName: quote.clientName,
      clientType: quote.clientType,
      currency: quote.currency,
      validityDays: String(quote.validityDays),
      status: quote.status,
      notes: quote.notes ?? "",
    },
  });

  useEffect(() => {
    reset({
      clientName: quote.clientName,
      clientType: quote.clientType,
      currency: quote.currency,
      validityDays: String(quote.validityDays),
      status: quote.status,
      notes: quote.notes ?? "",
    });
    setItems(
      quote.items?.length
        ? quote.items.map((row) => ({ ...row }))
        : [createEmptyLineItem()]
    );
    setClientDetails(quote.clientDetails ?? {});
  }, [quote, reset]);

  const status = watch("status") as QuoteStatus;
  const clientType = watch("clientType");
  const currency = watch("currency") || "MAD";
  const clientName = watch("clientName") || "";
  const validityDays = watch("validityDays") || String(quote.validityDays);
  const notes = watch("notes") || "";

  async function onSubmit(values: FormValues) {
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
    setSaving(true);

    const now = new Date().toISOString();
    const cleaned = validItems.map((row) => ({
      ...row,
      description: row.description.trim(),
      quantity: Number(row.quantity) || 1,
      unitPriceTtc: Number(row.unitPriceTtc) || 0,
    }));

    const result = await upsertQuote({
      ...quote,
      clientName: values.clientName.trim(),
      clientType: values.clientType as ClientType,
      clientDetails,
      service: summarizeService(cleaned),
      amount: documentAmountTtc(cleaned),
      currency: values.currency,
      validityDays: Number(values.validityDays),
      status: values.status as QuoteStatus,
      notes: values.notes?.trim() ?? "",
      items: cleaned,
      updatedAt: now,
    });

    if (!result.success) {
      toast.error(result.error);
      setSaving(false);
      return;
    }

    toast.success(f.quoteUpdated);
    router.push("/finance/quotes");
    router.refresh();
  }

  return (
    <div className="space-y-[18px]">
      <div className="fl-card fl-pad">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className="grid size-11 place-items-center rounded-xl text-white"
              style={{ background: "var(--grad-brand)" }}
            >
              <FileText className="size-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">{f.editQuote}</h2>
              <p className="mt-1 text-sm fl-faint fl-mono">{quote.number}</p>
            </div>
          </div>
          <Link href="/finance/quotes" className="fl-btn sm ghost">
            <ArrowLeft className="size-4" />
            {q.backToQuotes}
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-[18px]">
        <FinanceDocumentOptions
          statusFieldLabel={q.status}
          status={status}
          statusOptions={STATUSES.map((s) => ({
            value: s,
            label: q[s],
          }))}
          onStatusChange={(v) => setValue("status", v, { shouldValidate: true })}
          currency={currency}
          onCurrencyChange={(v) => setValue("currency", v, { shouldValidate: true })}
          clientType={clientType}
          onClientTypeChange={(v) =>
            setValue("clientType", v, { shouldValidate: true })
          }
          notes={notes}
          onNotesChange={(v) => setValue("notes", v)}
        />
        <FinanceDocumentEditor
          kind="quote"
          number={quote.number}
          statusLabel={q[status]}
          statusBadge={QUOTE_STATUS_BADGE[status] ?? "b-gray"}
          clientName={clientName}
          onClientNameChange={(v) =>
            setValue("clientName", v, { shouldValidate: true })
          }
          clientNameError={errors.clientName ? q.client : undefined}
          clientType={clientType}
          onClientTypeChange={(v) =>
            setValue("clientType", v, { shouldValidate: true })
          }
          clientDetails={clientDetails}
          onClientDetailsChange={setClientDetails}
          currency={currency}
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
          linesError={linesError ?? undefined}
          issuedAt={quote.createdAt}
        />

        <div className="fl-card fl-pad flex flex-wrap items-center justify-end gap-2">
          <Link href="/finance/quotes" className="fl-btn sm ghost">
            {dict.common.cancel}
          </Link>
          <button type="submit" className="fl-btn sm primary" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {dict.common.save}
          </button>
        </div>
      </form>
    </div>
  );
}

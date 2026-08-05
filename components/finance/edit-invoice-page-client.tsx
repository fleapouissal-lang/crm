"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Receipt } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { FinanceDocumentEditor } from "@/components/finance/finance-document-editor";
import { FinanceDocumentOptions } from "@/components/finance/finance-document-options";
import {
  INVOICE_STATUS_BADGE,
  createEmptyLineItem,
  documentAmountTtc,
  type ClientDetails,
  type ClientType,
  type FinanceLineItem,
  type InvoiceRecord,
  type InvoiceStatus,
} from "@/lib/finance/types";
import { upsertInvoice } from "@/lib/actions/finance-docs";

const STATUSES: InvoiceStatus[] = ["draft", "pending", "paid", "overdue"];

const schema = z.object({
  number: z.string().min(1),
  clientName: z.string().min(1),
  clientType: z.enum(["pro", "particulier"]),
  currency: z.string().min(1),
  dueDate: z.string().min(1),
  status: z.string(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function EditInvoicePageClient({ invoice }: { invoice: InvoiceRecord }) {
  const dict = useDict();
  const router = useRouter();
  const inv = dict.fusion.invoices;
  const f = dict.fusion.financeDocs;
  const [items, setItems] = useState<FinanceLineItem[]>(
    invoice.items?.length
      ? invoice.items.map((row) => ({ ...row }))
      : [createEmptyLineItem()]
  );
  const [linesError, setLinesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clientDetails, setClientDetails] = useState<ClientDetails>(
    invoice.clientDetails ?? {}
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
      number: invoice.number,
      clientName: invoice.clientName,
      clientType: invoice.clientType,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      status: invoice.status,
      notes: invoice.notes ?? "",
    },
  });

  useEffect(() => {
    reset({
      number: invoice.number,
      clientName: invoice.clientName,
      clientType: invoice.clientType,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      status: invoice.status,
      notes: invoice.notes ?? "",
    });
    setItems(
      invoice.items?.length
        ? invoice.items.map((row) => ({ ...row }))
        : [createEmptyLineItem()]
    );
    setClientDetails(invoice.clientDetails ?? {});
  }, [invoice, reset]);

  const status = watch("status") as InvoiceStatus;
  const clientType = watch("clientType");
  const currency = watch("currency") || "MAD";
  const clientName = watch("clientName") || "";
  const notes = watch("notes") || "";
  const number = watch("number") || "";
  const dueDate = watch("dueDate") || invoice.dueDate;

  function statusLabel(key: string) {
    if (key === "overdue") return inv.overdueStatus;
    return inv[key as keyof typeof inv] as string;
  }

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

    const result = await upsertInvoice({
      ...invoice,
      number: values.number.trim(),
      clientName: values.clientName.trim(),
      clientType: values.clientType as ClientType,
      clientDetails,
      amount: documentAmountTtc(cleaned),
      currency: values.currency,
      dueDate: values.dueDate,
      status: values.status as InvoiceStatus,
      notes: values.notes?.trim() ?? "",
      items: cleaned,
      updatedAt: now,
    });

    if (!result.success) {
      toast.error(result.error);
      setSaving(false);
      return;
    }

    toast.success(f.invoiceUpdated);
    router.push("/finance/invoices");
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
              <Receipt className="size-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">{f.editInvoice}</h2>
              <p className="mt-1 text-sm fl-faint fl-mono">{invoice.number}</p>
            </div>
          </div>
          <Link href="/finance/invoices" className="fl-btn sm ghost">
            <ArrowLeft className="size-4" />
            {inv.backToInvoices}
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-[18px]">
        <FinanceDocumentOptions
          statusFieldLabel={inv.status}
          status={status}
          statusOptions={STATUSES.map((s) => ({
            value: s,
            label: statusLabel(s),
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
          dueDateLabel={inv.dueDate}
          dueDate={dueDate}
          onDueDateChange={(v) =>
            setValue("dueDate", v, { shouldValidate: true })
          }
          dueDateError={errors.dueDate ? inv.dueDate : undefined}
        />
        <FinanceDocumentEditor
          kind="invoice"
          number={number}
          onNumberChange={(v) => setValue("number", v, { shouldValidate: true })}
          numberError={errors.number ? inv.number : undefined}
          statusLabel={statusLabel(status)}
          statusBadge={INVOICE_STATUS_BADGE[status] ?? "b-gray"}
          isPaid={status === "paid"}
          clientName={clientName}
          onClientNameChange={(v) =>
            setValue("clientName", v, { shouldValidate: true })
          }
          clientNameError={errors.clientName ? f.previewClient : undefined}
          clientType={clientType}
          onClientTypeChange={(v) =>
            setValue("clientType", v, { shouldValidate: true })
          }
          clientDetails={clientDetails}
          onClientDetailsChange={setClientDetails}
          currency={currency}
          metaFields={[]}
          items={items}
          onItemsChange={setItems}
          linesError={linesError ?? undefined}
          issuedAt={invoice.createdAt}
        />

        <div className="fl-card fl-pad flex flex-wrap items-center justify-end gap-2">
          <Link href="/finance/invoices" className="fl-btn sm ghost">
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

"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Receipt, Loader2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { LineItemsEditor } from "@/components/finance/line-items-editor";
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
  createEmptyLineItem,
  documentAmountTtc,
  nextInvoiceNumber,
  type ClientType,
  type FinanceLineItem,
  type InvoiceStatus,
} from "@/lib/finance/types";
import { loadInvoices, loadTemplates, saveInvoices } from "@/lib/finance/storage";
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

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function CreateInvoicePageClient() {
  const dict = useDict();
  const router = useRouter();
  const inv = dict.fusion.invoices;
  const f = dict.fusion.financeDocs;
  const templates = useMemo(
    () => loadTemplates().filter((t) => t.kind === "invoice"),
    []
  );
  const [items, setItems] = useState<FinanceLineItem[]>([
    createEmptyLineItem(),
  ]);
  const [linesError, setLinesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientName: "",
      clientType: "pro",
      currency: "MAD",
      dueDate: defaultDueDate(),
      status: "pending",
      templateId: templates[0]?.id ?? "",
      notes: "",
    },
  });

  const status = watch("status");
  const templateId = watch("templateId");
  const clientType = watch("clientType");
  const currency = watch("currency") || "MAD";

  function statusLabel(key: string) {
    if (key === "overdue") return inv.overdueStatus;
    return inv[key as keyof typeof inv] as string;
  }

  function onSubmit(values: FormValues) {
    const validItems = items.filter(
      (row) => row.description.trim() && lineItemHasAmount(row)
    );
    if (validItems.length === 0) {
      setLinesError(f.linesRequired);
      return;
    }
    setLinesError(null);
    setSaving(true);

    const existing = loadInvoices();
    const now = new Date().toISOString();
    const cleaned = validItems.map((row) => ({
      ...row,
      description: row.description.trim(),
      quantity: Number(row.quantity) || 1,
      unitPriceTtc: Number(row.unitPriceTtc) || 0,
    }));

    const record = {
      id: `inv-${crypto.randomUUID().slice(0, 8)}`,
      number: nextInvoiceNumber(existing),
      clientName: values.clientName.trim(),
      clientType: values.clientType as ClientType,
      amount: documentAmountTtc(cleaned),
      currency: values.currency,
      dueDate: values.dueDate,
      status: values.status as InvoiceStatus,
      templateId: values.templateId || null,
      quoteId: null,
      notes: values.notes?.trim() ?? "",
      items: cleaned,
      createdAt: now,
      updatedAt: now,
    };

    saveInvoices([record, ...existing]);
    toast.success(f.invoiceCreated);
    router.push("/finance/invoices");
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
              <h2 className="text-lg font-semibold">{inv.newInvoice}</h2>
              <p className="mt-1 text-sm fl-faint">{inv.newInvoiceSub}</p>
            </div>
          </div>
          <Link href="/finance/invoices" className="fl-btn sm ghost">
            <ArrowLeft className="size-4" />
            {inv.backToInvoices}
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-[18px]">
        <section className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{inv.client}</h3>
              <div className="ch-sub">{inv.recentInvoicesSub}</div>
            </div>
          </div>
          <div className="fl-pad space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={inv.client}
                htmlFor="ci-client"
                error={errors.clientName?.message}
              >
                <Input id="ci-client" className="fl-inp" {...register("clientName")} />
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
                          clientType === "pro"
                            ? "clientPro"
                            : "clientParticulier"
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
              <Field label={f.currency} htmlFor="ci-currency">
                <Input id="ci-currency" className="fl-inp" {...register("currency")} />
              </Field>
              <Field
                label={inv.dueDate}
                htmlFor="ci-due"
                error={errors.dueDate?.message}
              >
                <Input
                  id="ci-due"
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
                      ? templates.find((t) => t.id === templateId)?.name ??
                        f.noTemplate
                      : f.noTemplate}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{f.noTemplate}</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={dict.common.notes} htmlFor="ci-notes">
              <Textarea
                id="ci-notes"
                className="fl-inp min-h-[80px]"
                {...register("notes")}
              />
            </Field>
          </div>
        </section>

        <section className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{f.lineItems}</h3>
              <div className="ch-sub">{f.lineItemsHint}</div>
            </div>
          </div>
          <div className="fl-pad">
            <LineItemsEditor
              items={items}
              currency={currency}
              onChange={setItems}
              error={linesError ?? undefined}
            />
          </div>
        </section>

        <div className="fl-card fl-pad flex flex-wrap items-center justify-end gap-2">
          <Link href="/finance/invoices" className="fl-btn sm ghost">
            {dict.common.cancel}
          </Link>
          <button type="submit" className="fl-btn sm primary" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {inv.createInvoice}
          </button>
        </div>
      </form>
    </div>
  );
}

function lineItemHasAmount(row: FinanceLineItem): boolean {
  return (Number(row.quantity) || 0) > 0 && (Number(row.unitPriceTtc) || 0) > 0;
}

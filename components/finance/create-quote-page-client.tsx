"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
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
  nextQuoteNumber,
  summarizeService,
  type ClientType,
  type FinanceLineItem,
  type QuoteStatus,
} from "@/lib/finance/types";
import { loadQuotes, loadTemplates, saveQuotes } from "@/lib/finance/storage";
import { cn } from "@/lib/utils";

const STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "expired", "refused"];
const CLIENT_TYPES: ClientType[] = ["pro", "particulier"];

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

export function CreateQuotePageClient() {
  const dict = useDict();
  const router = useRouter();
  const q = dict.fusion.quotes;
  const f = dict.fusion.financeDocs;
  const templates = useMemo(
    () => loadTemplates().filter((t) => t.kind === "quote"),
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
      validityDays: "30",
      status: "draft",
      templateId: templates[0]?.id ?? "",
      notes: "",
    },
  });

  const status = watch("status");
  const templateId = watch("templateId");
  const clientType = watch("clientType");
  const currency = watch("currency") || "MAD";

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

    const existing = loadQuotes();
    const now = new Date().toISOString();
    const cleaned = validItems.map((row) => ({
      ...row,
      description: row.description.trim(),
      quantity: Number(row.quantity) || 1,
      unitPriceTtc: Number(row.unitPriceTtc) || 0,
    }));

    const record = {
      id: `q-${crypto.randomUUID().slice(0, 8)}`,
      number: nextQuoteNumber(existing),
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
      createdAt: now,
      updatedAt: now,
    };

    saveQuotes([record, ...existing]);
    toast.success(f.quoteCreated);
    router.push("/finance/quotes");
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
              <h2 className="text-lg font-semibold">{q.newQuote}</h2>
              <p className="mt-1 text-sm fl-faint">{q.newQuoteSub}</p>
            </div>
          </div>
          <Link href="/finance/quotes" className="fl-btn sm ghost">
            <ArrowLeft className="size-4" />
            {q.backToQuotes}
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-[18px]">
        <section className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{q.client}</h3>
              <div className="ch-sub">{q.recentQuotesSub}</div>
            </div>
          </div>
          <div className="fl-pad space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={q.client}
                htmlFor="cq-client"
                error={errors.clientName?.message}
              >
                <Input id="cq-client" className="fl-inp" {...register("clientName")} />
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
              <Field label={f.currency} htmlFor="cq-currency">
                <Input id="cq-currency" className="fl-inp" {...register("currency")} />
              </Field>
              <Field
                label={q.validity}
                htmlFor="cq-validity"
                error={errors.validityDays?.message}
              >
                <Input
                  id="cq-validity"
                  type="number"
                  min={1}
                  max={365}
                  className="fl-inp"
                  {...register("validityDays")}
                />
              </Field>
              <Field label={q.status}>
                <Select
                  value={status}
                  onValueChange={(v) => v && setValue("status", v)}
                >
                  <SelectTrigger className="fl-inp h-auto w-full">
                    <SelectValue>
                      {q[status as QuoteStatus] ?? status}
                    </SelectValue>
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
            <Field label={dict.common.notes} htmlFor="cq-notes">
              <Textarea
                id="cq-notes"
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
          <Link href="/finance/quotes" className="fl-btn sm ghost">
            {dict.common.cancel}
          </Link>
          <button type="submit" className="fl-btn sm primary" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {q.createQuote}
          </button>
        </div>
      </form>
    </div>
  );
}

function lineItemHasAmount(row: FinanceLineItem): boolean {
  return (Number(row.quantity) || 0) > 0 && (Number(row.unitPriceTtc) || 0) > 0;
}

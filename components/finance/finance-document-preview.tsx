"use client";

import { format } from "date-fns";
import { FileText, Receipt } from "lucide-react";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { FUSION_COMPANY } from "@/lib/finance/company-info";
import { formatMoney } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

export function FinanceDocumentPreview({
  kind,
  number,
  statusLabel,
  statusBadge,
  clientName,
  amount,
  currency,
  secondaryLabel,
  secondaryValue,
  tertiaryLabel,
  tertiaryValue,
  lineItems,
}: {
  kind: "quote" | "invoice";
  number: string;
  statusLabel: string;
  statusBadge: string;
  clientName: string;
  amount: number;
  currency: string;
  secondaryLabel: string;
  secondaryValue: string;
  tertiaryLabel?: string;
  tertiaryValue?: string;
  lineItems?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPriceTtc: number;
  }>;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const f = dict.fusion.financeDocs;
  const today = format(new Date(), "dd MMM yyyy", { locale: dateLocale });
  const Icon = kind === "quote" ? FileText : Receipt;

  const isInvoice = kind === "invoice";

  return (
    <div
      className={cn(
        "fl-finance-doc overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--glass-solid)] shadow-[0_24px_48px_-28px_rgba(0,0,0,0.35)]",
        isInvoice && "fl-finance-doc--mono"
      )}
    >
      <div className="fl-finance-doc__bar" aria-hidden />
      <div className="fl-finance-doc__head fl-pad">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={cn(
              "fl-tny font-semibold uppercase tracking-[0.14em]",
              isInvoice ? "text-[var(--text)]" : "text-[var(--iris)]"
            )}>
              {FUSION_COMPANY.name}
            </p>
            <p className="mt-0.5 text-[11px] fl-faint">
              {FUSION_COMPANY.legalForm} · {FUSION_COMPANY.addressLine2}
            </p>
          </div>
          <div className="text-end">
            <div className="inline-flex items-center gap-2">
              <span
              className={cn(
                "grid size-9 place-items-center rounded-xl",
                isInvoice
                  ? "bg-[var(--text)] text-[var(--bg)]"
                  : "text-white"
              )}
              style={isInvoice ? undefined : { background: "var(--grad-brand)" }}
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className={cn(
                  "text-[11px] font-semibold uppercase tracking-wide",
                  isInvoice ? "text-[var(--text-dim)]" : "text-[var(--iris)]"
                )}>
                  {kind === "quote" ? f.kindQuote : f.kindInvoice}
                </p>
                <p className="fl-mono text-sm font-semibold">{number}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-y border-[var(--border)] bg-[var(--glass-hi)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="fl-tny fl-faint uppercase">{f.previewClient}</p>
            <p className="mt-1 text-[15px] font-semibold">{clientName}</p>
          </div>
          <span className={cn("fl-badge", statusBadge)}>{statusLabel}</span>
        </div>
      </div>

      <div className="fl-pad space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] px-3 py-2.5">
            <dt className="fl-tny fl-faint uppercase">{f.previewDate}</dt>
            <dd className="mt-1 font-medium">{today}</dd>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] px-3 py-2.5">
            <dt className="fl-tny fl-faint uppercase">{secondaryLabel}</dt>
            <dd className="mt-1 font-medium">{secondaryValue}</dd>
          </div>
          {tertiaryLabel && tertiaryValue ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] px-3 py-2.5">
              <dt className="fl-tny fl-faint uppercase">{tertiaryLabel}</dt>
              <dd className="mt-1 font-medium">{tertiaryValue}</dd>
            </div>
          ) : null}
        </dl>

        {lineItems?.length ? (
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <div className={cn(
              "grid grid-cols-[1fr_auto] gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide",
              isInvoice
                ? "bg-[var(--glass-hi)] text-[var(--text-dim)]"
                : "bg-[color-mix(in_oklch,var(--iris),transparent_88%)] text-[var(--iris-2)]"
            )}>
              <span>{f.previewLines}</span>
              <span>{f.amountTotal}</span>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {lineItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{item.description}</p>
                    <p className="fl-tny fl-faint">
                      {item.quantity} × {formatMoney(item.unitPriceTtc, currency)}
                    </p>
                  </div>
                  <p className="fl-mono shrink-0 font-semibold">
                    {formatMoney(item.quantity * item.unitPriceTtc, currency)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={cn(
          "flex items-end justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3",
          isInvoice
            ? "bg-[var(--glass-hi)]"
            : "bg-[color-mix(in_oklch,var(--gold),transparent_92%)]"
        )}>
          <p className="text-sm font-medium">{f.previewTotal}</p>
          <p className={cn(
            "fl-mono text-xl font-bold",
            isInvoice ? "text-[var(--text)]" : "text-[var(--iris)]"
          )}>
            {formatMoney(amount, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

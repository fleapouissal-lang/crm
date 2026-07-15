"use client";

import { format } from "date-fns";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { useOrgIssuer } from "@/components/finance/org-issuer-provider";
import { OrgLogo } from "@/components/shared/org-logo";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { issuerSubtitle } from "@/lib/finance/company-info";
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
  templateName,
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
  templateName?: string | null;
  lineItems?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPriceTtc: number;
  }>;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const issuer = useOrgIssuer();
  const dateLocale = getDateFnsLocale(locale);
  const f = dict.fusion.financeDocs;
  const today = format(new Date(), "dd MMM yyyy", { locale: dateLocale });
  const subtitle = issuerSubtitle(issuer);
  const kindLabel = kind === "quote" ? f.kindQuote : f.kindInvoice;
  const meta = [
    { label: f.previewDate, value: today },
    { label: secondaryLabel, value: secondaryValue },
    ...(tertiaryLabel && tertiaryValue
      ? [{ label: tertiaryLabel, value: tertiaryValue }]
      : []),
  ];

  return (
    <article className={cn("fl-lux-doc", kind === "invoice" && "fl-lux-doc--invoice")}>
      <div className="fl-lux-doc__rail" aria-hidden />

      <div className="fl-lux-doc__inner">
        <header className="fl-lux-doc__masthead">
          <div className="fl-lux-doc__brand">
            {issuer.logoUrl || issuer.storedLogoUrl ? (
              <OrgLogo
                organizationId={issuer.organizationId}
                logoUrl={issuer.storedLogoUrl ?? issuer.logoUrl}
                size="md"
                className="fl-lux-doc__logo"
                alt={issuer.name}
              />
            ) : (
              <span className="fl-lux-doc__initial" aria-hidden>
                {issuer.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="fl-lux-doc__company">{issuer.name}</p>
              {subtitle ? <p className="fl-lux-doc__company-sub">{subtitle}</p> : null}
            </div>
          </div>

          <div className="fl-lux-doc__seal">
            <p className="fl-lux-doc__seal-kind">{kindLabel}</p>
            <p className="fl-lux-doc__seal-no">{number}</p>
            <span className={cn("fl-badge fl-lux-doc__seal-status", statusBadge)}>
              {statusLabel}
            </span>
          </div>
        </header>

        <div className="fl-lux-doc__rule" aria-hidden />

        <section className="fl-lux-doc__grid">
          <div className="fl-lux-doc__panel">
            <p className="fl-lux-doc__eyebrow">{f.previewClient}</p>
            <p className="fl-lux-doc__headline">{clientName}</p>
          </div>

          {templateName ? (
            <div className="fl-lux-doc__panel fl-lux-doc__panel--right">
              <p className="fl-lux-doc__eyebrow">{f.template}</p>
              <p className="fl-lux-doc__panel-value">{templateName}</p>
            </div>
          ) : (
            <div className="fl-lux-doc__panel fl-lux-doc__panel--right">
              <p className="fl-lux-doc__eyebrow">{kindLabel}</p>
              <p className="fl-lux-doc__panel-value fl-mono">{number}</p>
            </div>
          )}
        </section>

        <ul
          className={cn(
            "fl-lux-doc__facts",
            meta.length === 2 && "fl-lux-doc__facts--2"
          )}
        >
          {meta.map((item) => (
            <li key={item.label} className="fl-lux-doc__fact">
              <span className="fl-lux-doc__fact-label">{item.label}</span>
              <span className="fl-lux-doc__fact-value" title={item.value}>
                {item.value}
              </span>
            </li>
          ))}
        </ul>

        {lineItems?.length ? (
          <div className="fl-lux-doc__table-wrap">
            <table className="fl-lux-doc__table">
              <thead>
                <tr>
                  <th className="fl-lux-doc__col-idx">#</th>
                  <th>{f.previewLines}</th>
                  <th className="fl-lux-doc__col-qty">{f.lineQtyShort}</th>
                  <th className="fl-lux-doc__col-amt">{f.amountTotal}</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={item.id}>
                    <td className="fl-lux-doc__col-idx">
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td>
                      <span className="fl-lux-doc__item-name">{item.description}</span>
                      <span className="fl-lux-doc__item-rate">
                        {formatMoney(item.unitPriceTtc, currency)}
                      </span>
                    </td>
                    <td className="fl-lux-doc__col-qty">{item.quantity}</td>
                    <td className="fl-lux-doc__col-amt fl-mono">
                      {formatMoney(item.quantity * item.unitPriceTtc, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <footer className="fl-lux-doc__total">
          <div>
            <p className="fl-lux-doc__total-kicker">{f.previewTotal}</p>
            <p className="fl-lux-doc__total-hint">{kindLabel}</p>
          </div>
          <p className="fl-lux-doc__total-sum fl-mono">
            {formatMoney(amount, currency)}
          </p>
        </footer>
      </div>
    </article>
  );
}

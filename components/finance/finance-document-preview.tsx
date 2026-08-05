"use client";

import { format } from "date-fns";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { useOrgIssuer } from "@/components/finance/org-issuer-provider";
import { paginateLineItems } from "@/lib/finance/document-pagination";
import {
  splitTtcAmount,
  unitPriceDisplay,
} from "@/lib/finance/render-template";
import {
  formatMoney,
  lineItemTotalTtc,
  type ClientDetails,
} from "@/lib/finance/types";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { cn } from "@/lib/utils";
import type { FinanceIssuer } from "@/lib/finance/company-info";

export function issuerHeaderLines(issuer: FinanceIssuer): string[] {
  const address = [issuer.addressLine1, issuer.addressLine2, issuer.country]
    .filter(Boolean)
    .join(", ");
  const contact = [issuer.phone, issuer.email, issuer.website]
    .filter(Boolean)
    .join("  ·  ");
  return [address, contact].filter((l) => l.trim().length > 0);
}

export function issuerLegalLines(issuer: FinanceIssuer): string[] {
  const identity = [issuer.name, issuer.legalForm].filter(Boolean).join(" · ");
  const legal = [issuer.ice, issuer.rc, issuer.taxId, issuer.capital]
    .filter(Boolean)
    .join("  ·  ");
  const banking = [issuer.bank, issuer.iban].filter(Boolean).join("  ·  ");
  return [
    [identity, legal].filter(Boolean).join("  —  "),
    banking,
  ].filter((l) => l.trim().length > 0);
}

export function clientDetailLines(details?: ClientDetails | null): string[] {
  if (!details) return [];
  return [
    details.ice?.trim() ? `ICE : ${details.ice.trim()}` : "",
    details.rc?.trim() ? `RC : ${details.rc.trim()}` : "",
    details.address?.trim() ?? "",
  ].filter(Boolean);
}

export function FinanceDocumentPreview({
  kind,
  number,
  statusLabel,
  clientName,
  clientDetails,
  amount,
  currency,
  issuedAt,
  secondaryLabel,
  secondaryValue,
  tertiaryLabel,
  tertiaryValue,
  lineItems,
  notes,
  isPaid,
}: {
  kind: "quote" | "invoice";
  number: string;
  statusLabel: string;
  statusBadge?: string;
  clientName: string;
  clientDetails?: ClientDetails | null;
  amount: number;
  currency: string;
  issuedAt?: string | null;
  secondaryLabel?: string;
  secondaryValue?: string;
  tertiaryLabel?: string;
  tertiaryValue?: string;
  lineItems?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPriceTtc: number;
  }>;
  notes?: string | null;
  isPaid?: boolean;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const issuer = useOrgIssuer();
  const dateLocale = getDateFnsLocale(locale);
  const f = dict.fusion.financeDocs;
  const issueDate = issuedAt
    ? format(new Date(issuedAt), "dd/MM/yyyy", { locale: dateLocale })
    : format(new Date(), "dd/MM/yyyy", { locale: dateLocale });
  const kindLabel = kind === "quote" ? f.kindQuote : f.kindInvoice;
  const showPayStamp = kind === "invoice" && typeof isPaid === "boolean";
  const { ht, tva, ttc } = splitTtcAmount(amount, issuer.tvaRate);
  const tvaPct = Math.round(issuer.tvaRate * 1000) / 10;
  const priceMode = issuer.priceMode;
  const unitColLabel = priceMode === "ht" ? f.unitPriceHt : f.unitPriceTtc;
  const rows = lineItems ?? [];
  const pages = paginateLineItems(rows);
  const totalPages = pages.length;
  const headerLines = issuerHeaderLines(issuer);
  const legalLines = issuerLegalLines(issuer);
  const clientLines = clientDetailLines(clientDetails);

  return (
    <div className="fl-fr-doc-stack">
      {pages.map((pageRows, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === totalPages - 1;

        return (
          <article
            key={pageIndex}
            className={cn(
              "fl-fr-doc fl-fr-doc--sheet",
              kind === "invoice" ? "fl-fr-doc--invoice" : "fl-fr-doc--quote"
            )}
          >
            {showPayStamp && isFirst ? (
              <div className="fl-fr-doc__pay-stamp" aria-hidden>
                {isPaid ? f.stampPaid : f.stampUnpaid}
              </div>
            ) : null}

            <div className="fl-fr-doc__page">
              {isFirst ? (
                <>
                  <header className="fl-fr-doc__masthead">
                    <div className="fl-fr-doc__logo">
                      {issuer.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={issuer.logoUrl} alt="" />
                      ) : (
                        <p className="fl-fr-doc__co-name">{issuer.name}</p>
                      )}
                    </div>
                    <div className="fl-fr-doc__title-block fl-fr-doc__title-block--top">
                      <h1 className="fl-fr-doc__title">
                        {kindLabel.toUpperCase()}
                      </h1>
                      <p className="fl-fr-doc__number fl-mono">{number}</p>
                      <p className="fl-fr-doc__status-line">{statusLabel}</p>
                    </div>
                  </header>

                  <div className="fl-fr-doc__rule" />

                  <section className="fl-fr-doc__info">
                    <div className="fl-fr-doc__co fl-fr-doc__co--stack">
                      <p className="fl-fr-doc__co-name">{issuer.name}</p>
                      <div className="fl-fr-doc__co-lines">
                        {headerLines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                      <div className="fl-fr-doc__meta fl-fr-doc__meta--under fl-fr-doc__meta--left">
                        <div className="fl-fr-doc__meta-row">
                          <span>{f.previewDate}</span>
                          <span>{issueDate}</span>
                        </div>
                        {secondaryLabel && secondaryValue ? (
                          <div className="fl-fr-doc__meta-row">
                            <span>{secondaryLabel}</span>
                            <span>{secondaryValue}</span>
                          </div>
                        ) : null}
                        {tertiaryLabel && tertiaryValue ? (
                          <div className="fl-fr-doc__meta-row">
                            <span>{tertiaryLabel}</span>
                            <span>{tertiaryValue}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="fl-fr-doc__billto fl-fr-doc__billto--right">
                      <p className="fl-fr-doc__billto-label">
                        {kind === "quote" ? f.previewClient : f.billedTo}
                      </p>
                      <p className="fl-fr-doc__client-name">{clientName}</p>
                      {clientLines.length ? (
                        <div className="fl-fr-doc__billto-lines">
                          {clientLines.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </section>
                </>
              ) : (
                <div className="fl-fr-doc__continuation">
                  <strong>
                    {kindLabel.toUpperCase()} — {f.documentContinuation}
                  </strong>
                  <span className="fl-mono">{number}</span>
                </div>
              )}

              <div className="fl-fr-doc__table-area">
                <table className="fl-fr-doc__table">
                  <thead>
                    <tr>
                      <th>{f.designation}</th>
                      <th className="fl-fr-doc__col-qty">{f.lineQtyShort}</th>
                      <th className="fl-fr-doc__col-unit">{unitColLabel}</th>
                      <th className="fl-fr-doc__col-amt">{f.lineAmount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((item) => {
                      const lineTtc = lineItemTotalTtc(item);
                      const lineDisplay =
                        priceMode === "ht"
                          ? splitTtcAmount(lineTtc, issuer.tvaRate).ht
                          : lineTtc;
                      return (
                        <tr key={item.id}>
                          <td>{item.description}</td>
                          <td className="fl-fr-doc__col-qty">
                            {item.quantity}
                          </td>
                          <td className="fl-fr-doc__col-unit fl-mono">
                            {formatMoney(
                              unitPriceDisplay(
                                item.unitPriceTtc,
                                priceMode,
                                issuer.tvaRate
                              ),
                              currency
                            )}
                          </td>
                          <td className="fl-fr-doc__col-amt fl-mono">
                            {formatMoney(lineDisplay, currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isLast ? (
                <>
                  <section className="fl-fr-doc__totals">
                    <div className="fl-fr-doc__sums">
                      <div className="fl-fr-doc__sum-row">
                        <span>{f.subtotal}</span>
                        <span className="fl-mono">
                          {formatMoney(ht, currency)}
                        </span>
                      </div>
                      <div className="fl-fr-doc__sum-row">
                        <span>TVA ({tvaPct} %)</span>
                        <span className="fl-mono">
                          {formatMoney(tva, currency)}
                        </span>
                      </div>
                      <div className="fl-fr-doc__sum-row fl-fr-doc__sum-row--total">
                        <span>{f.totalToPay}</span>
                        <span className="fl-mono">
                          {formatMoney(ttc, currency)}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="fl-fr-doc__bottom">
                    <div className="fl-fr-doc__terms">
                      {notes?.trim() ? (
                        <>
                          <h4>{f.termsTitle}</h4>
                          <p>{notes}</p>
                        </>
                      ) : null}
                    </div>
                    <div className="fl-fr-doc__sig">
                      <div className="fl-fr-doc__sig-line" />
                      <b>{issuer.name}</b>
                      <span>{f.signature}</span>
                    </div>
                  </section>
                </>
              ) : null}

              {legalLines.length ? (
                <footer className="fl-fr-doc__legal">
                  {legalLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </footer>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

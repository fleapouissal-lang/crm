"use client";

import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import {
  useFinanceSettings,
  useOrgIssuer,
} from "@/components/finance/org-issuer-provider";
import {
  issuerHeaderLines,
  issuerLegalLines,
} from "@/components/finance/finance-document-preview";
import { paginateLineItems } from "@/lib/finance/document-pagination";
import {
  splitTtcAmount,
  unitPriceDisplay,
  unitPriceToStored,
} from "@/lib/finance/render-template";
import {
  createEmptyLineItem,
  documentAmountTtc,
  formatMoney,
  lineItemTotalTtc,
  type ClientDetails,
  type ClientType,
  type FinanceLineItem,
} from "@/lib/finance/types";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { cn } from "@/lib/utils";

type MetaField =
  | {
      key: string;
      label: string;
      kind: "text" | "number" | "date";
      value: string;
      onChange: (value: string) => void;
      min?: number;
      max?: number;
      error?: string;
    }
  | {
      key: string;
      label: string;
      kind: "select";
      value: string;
      onChange: (value: string) => void;
      options: Array<{ value: string; label: string }>;
    };

export function FinanceDocumentEditor({
  kind,
  number,
  onNumberChange,
  numberError,
  statusLabel,
  metaFields,
  clientName,
  onClientNameChange,
  clientNameError,
  clientType,
  onClientTypeChange,
  clientDetails,
  onClientDetailsChange,
  currency,
  items,
  onItemsChange,
  linesError,
  issuedAt,
  isPaid,
}: {
  kind: "quote" | "invoice";
  number: string;
  onNumberChange?: (value: string) => void;
  numberError?: string;
  statusLabel: string;
  statusBadge?: string;
  metaFields: MetaField[];
  clientName: string;
  onClientNameChange: (value: string) => void;
  clientNameError?: string;
  clientType: ClientType;
  onClientTypeChange: (value: ClientType) => void;
  clientDetails?: ClientDetails;
  onClientDetailsChange?: (details: ClientDetails) => void;
  currency: string;
  items: FinanceLineItem[];
  onItemsChange: (items: FinanceLineItem[]) => void;
  linesError?: string;
  issuedAt?: string | null;
  isPaid?: boolean;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const issuer = useOrgIssuer();
  const { priceMode, tvaRate } = useFinanceSettings();
  const dateLocale = getDateFnsLocale(locale);
  const f = dict.fusion.financeDocs;
  const issueDate = issuedAt
    ? format(new Date(issuedAt), "dd/MM/yyyy", { locale: dateLocale })
    : format(new Date(), "dd/MM/yyyy", { locale: dateLocale });
  const kindLabel = kind === "quote" ? f.kindQuote : f.kindInvoice;
  const totalTtc = documentAmountTtc(items);
  const { ht, tva, ttc } = splitTtcAmount(totalTtc, tvaRate);
  const tvaPct = Math.round(tvaRate * 1000) / 10;
  const cur = currency || "MAD";
  const unitColLabel = priceMode === "ht" ? f.unitPriceHt : f.unitPriceTtc;
  const pages = paginateLineItems(items);
  const totalPages = pages.length;
  const headerLines = issuerHeaderLines(issuer);
  const legalLines = issuerLegalLines(issuer);
  const details = clientDetails ?? {};

  function updateDetails(patch: Partial<ClientDetails>) {
    onClientDetailsChange?.({ ...details, ...patch });
  }

  function updateItem(id: string, patch: Partial<FinanceLineItem>) {
    onItemsChange(
      items.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function updateUnitPrice(id: string, displayValue: number) {
    updateItem(id, {
      unitPriceTtc: unitPriceToStored(displayValue, priceMode, tvaRate),
    });
  }

  function removeItem(id: string) {
    if (items.length <= 1) {
      onItemsChange([createEmptyLineItem()]);
      return;
    }
    onItemsChange(items.filter((row) => row.id !== id));
  }

  function addItem() {
    onItemsChange([...items, createEmptyLineItem()]);
  }

  return (
    <div className="fl-fin-editor">
      <div className="fl-fin-editor__stage">
        <div className="fl-fr-doc-stack">
          {pages.map((pageItems, pageIndex) => {
            const isFirst = pageIndex === 0;
            const isLast = pageIndex === totalPages - 1;

            return (
              <article
                key={pageIndex}
                className={cn(
                  "fl-fr-doc fl-fr-doc--sheet fl-fr-doc--editor",
                  kind === "quote" ? "fl-fr-doc--quote" : "fl-fr-doc--invoice"
                )}
              >
                {kind === "invoice" && isFirst && typeof isPaid === "boolean" ? (
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
                          {onNumberChange ? (
                            <input
                              id="fin-doc-number"
                              className="fl-fr-doc__inp fl-fr-doc__inp--meta fl-fr-doc__number"
                              value={number}
                              onChange={(e) => onNumberChange(e.target.value)}
                              aria-invalid={Boolean(numberError)}
                            />
                          ) : (
                            <p className="fl-fr-doc__number fl-mono">
                              {number}
                            </p>
                          )}
                          <p className="fl-fr-doc__status-line">
                            {statusLabel}
                          </p>
                          {numberError ? (
                            <p className="fl-fr-doc__error">{numberError}</p>
                          ) : null}
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
                            {metaFields.map((field) => (
                              <div
                                key={field.key}
                                className="fl-fr-doc__meta-row"
                              >
                                <span>{field.label}</span>
                                <div>
                                  {field.kind === "select" ? (
                                    <select
                                      className="fl-fr-doc__inp fl-fr-doc__inp--meta"
                                      value={field.value}
                                      onChange={(e) =>
                                        field.onChange(e.target.value)
                                      }
                                    >
                                      {field.options.map((opt) => (
                                        <option
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type={field.kind}
                                      className="fl-fr-doc__inp fl-fr-doc__inp--meta"
                                      value={field.value}
                                      min={field.min}
                                      max={field.max}
                                      onChange={(e) =>
                                        field.onChange(e.target.value)
                                      }
                                    />
                                  )}
                                  {"error" in field && field.error ? (
                                    <p className="fl-fr-doc__error">
                                      {field.error}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="fl-fr-doc__billto fl-fr-doc__billto--right">
                          <p className="fl-fr-doc__billto-label">
                            {kind === "quote" ? f.previewClient : f.billedTo}
                          </p>
                          <input
                            className="fl-fr-doc__inp fl-fr-doc__inp--client"
                            value={clientName}
                            onChange={(e) =>
                              onClientNameChange(e.target.value)
                            }
                            placeholder={f.previewClient}
                            aria-invalid={Boolean(clientNameError)}
                          />
                          {clientNameError ? (
                            <p className="fl-fr-doc__error">
                              {clientNameError}
                            </p>
                          ) : null}
                          {onClientDetailsChange ? (
                            <div className="fl-fr-doc__billto-fields">
                              {clientType === "pro" ? (
                                <>
                                  <div className="fl-fr-doc__billto-field">
                                    <span>ICE</span>
                                    <input
                                      className="fl-fr-doc__inp fl-fr-doc__inp--detail"
                                      value={details.ice ?? ""}
                                      placeholder="—"
                                      onChange={(e) =>
                                        updateDetails({ ice: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="fl-fr-doc__billto-field">
                                    <span>RC</span>
                                    <input
                                      className="fl-fr-doc__inp fl-fr-doc__inp--detail"
                                      value={details.rc ?? ""}
                                      placeholder="—"
                                      onChange={(e) =>
                                        updateDetails({ rc: e.target.value })
                                      }
                                    />
                                  </div>
                                </>
                              ) : null}
                              <div className="fl-fr-doc__billto-field">
                                <span>{f.clientAddress}</span>
                                <input
                                  className="fl-fr-doc__inp fl-fr-doc__inp--detail"
                                  value={details.address ?? ""}
                                  placeholder="—"
                                  onChange={(e) =>
                                    updateDetails({ address: e.target.value })
                                  }
                                />
                              </div>
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
                          <th className="fl-fr-doc__col-qty">
                            {f.lineQtyShort}
                          </th>
                          <th className="fl-fr-doc__col-unit">
                            {unitColLabel}
                          </th>
                          <th className="fl-fr-doc__col-amt">
                            {f.lineAmount}
                          </th>
                          <th className="fl-fr-doc__col-act" />
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map((item) => {
                          const lineTtc = lineItemTotalTtc(item);
                          const lineDisplay =
                            priceMode === "ht"
                              ? splitTtcAmount(lineTtc, tvaRate).ht
                              : lineTtc;
                          return (
                            <tr key={item.id}>
                              <td>
                                <input
                                  className="fl-fr-doc__inp fl-fr-doc__inp--desc"
                                  value={item.description}
                                  placeholder={f.lineDescriptionPlaceholder}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      description: e.target.value,
                                    })
                                  }
                                />
                              </td>
                              <td className="fl-fr-doc__col-qty">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  className="fl-fr-doc__inp fl-fr-doc__inp--num"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      quantity: Number(e.target.value) || 0,
                                    })
                                  }
                                />
                              </td>
                              <td className="fl-fr-doc__col-unit">
                                <input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  className="fl-fr-doc__inp fl-fr-doc__inp--num"
                                  value={unitPriceDisplay(
                                    item.unitPriceTtc,
                                    priceMode,
                                    tvaRate
                                  )}
                                  onChange={(e) =>
                                    updateUnitPrice(
                                      item.id,
                                      Number(e.target.value) || 0
                                    )
                                  }
                                />
                              </td>
                              <td className="fl-fr-doc__col-amt">
                                {formatMoney(lineDisplay, cur)}
                              </td>
                              <td className="fl-fr-doc__col-act">
                                <button
                                  type="button"
                                  className="fl-fr-doc__icon-btn"
                                  onClick={() => removeItem(item.id)}
                                  aria-label={f.removeLine}
                                  title={f.removeLine}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {isLast ? (
                          <tr className="fl-fr-doc__add-row">
                            <td colSpan={5}>
                              <button type="button" onClick={addItem}>
                                <Plus className="size-3.5" strokeWidth={2} />
                                {f.addLine}
                              </button>
                            </td>
                          </tr>
                        ) : null}
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
                              {formatMoney(ht, cur)}
                            </span>
                          </div>
                          <div className="fl-fr-doc__sum-row">
                            <span>TVA ({tvaPct} %)</span>
                            <span className="fl-mono">
                              {formatMoney(tva, cur)}
                            </span>
                          </div>
                          <div className="fl-fr-doc__sum-row fl-fr-doc__sum-row--total">
                            <span>{f.totalToPay}</span>
                            <span className="fl-mono">
                              {formatMoney(ttc, cur)}
                            </span>
                          </div>
                        </div>
                      </section>

                      <section className="fl-fr-doc__bottom">
                        <div className="fl-fr-doc__terms" />
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

        {linesError ? (
          <div className="fl-fr-doc__table-foot">
            <p className="fl-fr-doc__error">{linesError}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

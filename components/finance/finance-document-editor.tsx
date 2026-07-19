"use client";

import { format } from "date-fns";
import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { useOrgIssuer } from "@/components/finance/org-issuer-provider";
import { OrgLogo } from "@/components/shared/org-logo";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { issuerCompanyLines } from "@/lib/finance/company-info";
import { splitTtcAmount } from "@/lib/finance/render-template";
import {
  createEmptyLineItem,
  documentAmountTtc,
  formatMoney,
  lineItemTotalTtc,
  type ClientType,
  type DocumentTemplate,
  type FinanceLineItem,
} from "@/lib/finance/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  statusFieldLabel,
  statusOptions,
  status,
  onStatusChange,
  clientName,
  onClientNameChange,
  clientNameError,
  clientType,
  onClientTypeChange,
  currency,
  onCurrencyChange,
  templateId,
  templates,
  onTemplateChange,
  metaFields,
  items,
  onItemsChange,
  notes,
  onNotesChange,
  linesError,
}: {
  kind: "quote" | "invoice";
  number: string;
  statusFieldLabel: string;
  statusBadge?: string;
  status: string;
  statusOptions: Array<{ value: string; label: string }>;
  onStatusChange: (value: string) => void;
  clientName: string;
  onClientNameChange: (value: string) => void;
  clientNameError?: string;
  clientType: ClientType;
  onClientTypeChange: (value: ClientType) => void;
  currency: string;
  onCurrencyChange: (value: string) => void;
  templateId: string;
  templates: DocumentTemplate[];
  onTemplateChange: (value: string) => void;
  metaFields: MetaField[];
  items: FinanceLineItem[];
  onItemsChange: (items: FinanceLineItem[]) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  linesError?: string;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const issuer = useOrgIssuer();
  const dateLocale = getDateFnsLocale(locale);
  const f = dict.fusion.financeDocs;
  const today = format(new Date(), "dd MMM yyyy", { locale: dateLocale });
  const companyLines = issuerCompanyLines(issuer);
  const kindLabel = kind === "quote" ? f.kindQuote : f.kindInvoice;
  const totalTtc = documentAmountTtc(items);
  const { ht, tva, ttc } = splitTtcAmount(totalTtc, issuer.tvaRate);
  const tvaPct = Math.round(issuer.tvaRate * 100);
  const cur = currency || "MAD";

  function updateItem(id: string, patch: Partial<FinanceLineItem>) {
    onItemsChange(
      items.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
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

  const statusOptionLabel =
    statusOptions.find((opt) => opt.value === status)?.label ?? status;
  const templateLabel = templateId
    ? templates.find((t) => t.id === templateId)?.name ?? f.noTemplate
    : f.noTemplate;

  return (
    <div className="fl-fin-editor">
      <section className="fl-form-section">
        <div className="fl-form-section__head">
          <SlidersHorizontal
            className="size-3.5 text-[var(--iris)]"
            strokeWidth={1.75}
          />
          <h4>{f.optionsPanel}</h4>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="fl-field">
            <label className="fl-field-label">{statusFieldLabel}</label>
            <Select
              value={status}
              onValueChange={(v) => v && onStatusChange(v)}
            >
              <SelectTrigger className="fl-select-trigger fl-input w-full">
                <SelectValue>{statusOptionLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent className="fl-select-panel">
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="fl-field">
            <label className="fl-field-label">{f.template}</label>
            <Select
              value={templateId || "none"}
              onValueChange={(v) => {
                if (!v || v === "none") onTemplateChange("");
                else onTemplateChange(v);
              }}
            >
              <SelectTrigger className="fl-select-trigger fl-input w-full">
                <SelectValue>{templateLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent className="fl-select-panel">
                <SelectItem value="none">{f.noTemplate}</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="fl-field">
            <label className="fl-field-label" htmlFor="fin-doc-currency">
              {f.currency}
            </label>
            <Input
              id="fin-doc-currency"
              className="fl-input"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="fl-fin-editor__stage">
        <article className="fl-fin-sheet">
          <div className="fl-fin-sheet__bar" aria-hidden />

          <div className="fl-fin-sheet__page">
            <header className="fl-fin-sheet__header">
              <div className="fl-fin-sheet__header-main">
                <h2 className="fl-fin-sheet__doc-kind">{kindLabel}</h2>
                <p className="fl-fin-sheet__doc-no">{number}</p>
                <div className="fl-fin-sheet__company-lines">
                  {companyLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
              <div className="fl-fin-sheet__logo-wrap">
                {issuer.logoUrl || issuer.storedLogoUrl ? (
                  <OrgLogo
                    organizationId={issuer.organizationId}
                    logoUrl={issuer.storedLogoUrl ?? issuer.logoUrl}
                    size="lg"
                    className="fl-fin-sheet__logo"
                    alt={issuer.name}
                  />
                ) : (
                  <span className="fl-fin-sheet__logo-fallback" aria-hidden>
                    {issuer.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            </header>

            <div className="fl-fin-sheet__rule" aria-hidden />

            <section className="fl-fin-sheet__meta">
              <div className="fl-fin-sheet__meta-row">
                <span>{f.previewDate}</span>
                <strong>{today}</strong>
              </div>
              {metaFields.map((field) => (
                <div key={field.key} className="fl-fin-sheet__meta-row">
                  <span>{field.label}</span>
                  {field.kind === "select" ? (
                    <select
                      className="fl-fin-sheet__inp fl-fin-sheet__inp--meta"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.kind}
                      className="fl-fin-sheet__inp fl-fin-sheet__inp--meta"
                      value={field.value}
                      min={field.min}
                      max={field.max}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  )}
                  {"error" in field && field.error ? (
                    <p className="fl-fin-sheet__error fl-fin-sheet__error--meta">
                      {field.error}
                    </p>
                  ) : null}
                </div>
              ))}
            </section>

            <section className="fl-fin-sheet__client">
              <div className="fl-fin-sheet__client-top">
                <p className="fl-fin-sheet__label">{f.previewClient}</p>
                <select
                  className="fl-fin-sheet__type-badge"
                  value={clientType}
                  onChange={(e) =>
                    onClientTypeChange(e.target.value as ClientType)
                  }
                >
                  <option value="pro">{f.clientPro}</option>
                  <option value="particulier">{f.clientParticulier}</option>
                </select>
              </div>
              <input
                className="fl-fin-sheet__inp fl-fin-sheet__inp--client"
                value={clientName}
                onChange={(e) => onClientNameChange(e.target.value)}
                placeholder={f.previewClient}
                aria-invalid={Boolean(clientNameError)}
              />
              {clientNameError ? (
                <p className="fl-fin-sheet__error">{clientNameError}</p>
              ) : null}
            </section>

            <div className="fl-fin-sheet__table-wrap">
              <table className="fl-fin-sheet__table">
                <thead>
                  <tr>
                    <th>{f.previewLines}</th>
                    <th className="fl-fin-sheet__col-qty">{f.lineQtyShort}</th>
                    <th className="fl-fin-sheet__col-unit">{f.unitPrice}</th>
                    <th className="fl-fin-sheet__col-amt">{f.amountTotal}</th>
                    <th className="fl-fin-sheet__col-act" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          className="fl-fin-sheet__inp fl-fin-sheet__inp--desc"
                          value={item.description}
                          placeholder={f.lineDescriptionPlaceholder}
                          onChange={(e) =>
                            updateItem(item.id, {
                              description: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="fl-fin-sheet__col-qty">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          className="fl-fin-sheet__inp fl-fin-sheet__inp--num"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, {
                              quantity: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td className="fl-fin-sheet__col-unit">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="fl-fin-sheet__inp fl-fin-sheet__inp--num"
                          value={item.unitPriceTtc}
                          onChange={(e) =>
                            updateItem(item.id, {
                              unitPriceTtc: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td className="fl-fin-sheet__col-amt">
                        {formatMoney(lineItemTotalTtc(item), cur)}
                      </td>
                      <td className="fl-fin-sheet__col-act">
                        <button
                          type="button"
                          className="fl-fin-sheet__icon-btn"
                          onClick={() => removeItem(item.id)}
                          aria-label={f.removeLine}
                          title={f.removeLine}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="fl-fin-sheet__table-foot">
                <button
                  type="button"
                  className="fl-fin-sheet__add-line"
                  onClick={addItem}
                >
                  <Plus className="size-3.5" strokeWidth={2} />
                  {f.addLine}
                </button>
                {linesError ? (
                  <p className="fl-fin-sheet__error">{linesError}</p>
                ) : null}
              </div>
            </div>

            <div className="fl-fin-sheet__bottom">
              <div className="fl-fin-sheet__notes">
                <p className="fl-fin-sheet__label">{dict.common.notes}</p>
                <textarea
                  className="fl-fin-sheet__inp fl-fin-sheet__inp--notes"
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  rows={3}
                  placeholder={dict.common.notes}
                />
              </div>

              <aside className="fl-fin-sheet__totals">
                <div className="fl-fin-sheet__totals-bar" aria-hidden />
                <div className="fl-fin-sheet__totals-row">
                  <span>Total HT</span>
                  <strong>{formatMoney(ht, cur)}</strong>
                </div>
                <div className="fl-fin-sheet__totals-row">
                  <span>TVA ({tvaPct} %)</span>
                  <strong>{formatMoney(tva, cur)}</strong>
                </div>
                <div className="fl-fin-sheet__totals-row fl-fin-sheet__totals-row--ttc">
                  <span>Total TTC</span>
                  <strong>{formatMoney(ttc, cur)}</strong>
                </div>
              </aside>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

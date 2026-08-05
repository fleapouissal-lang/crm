"use client";

import { SlidersHorizontal } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { useFinanceSettings } from "@/components/finance/org-issuer-provider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FinanceDocumentOptions({
  statusFieldLabel,
  status,
  statusOptions,
  onStatusChange,
  currency,
  onCurrencyChange,
  notes,
  onNotesChange,
  dueDateLabel,
  dueDate,
  onDueDateChange,
  dueDateError,
  clientType,
  onClientTypeChange,
}: {
  statusFieldLabel: string;
  status: string;
  statusOptions: Array<{ value: string; label: string }>;
  onStatusChange: (value: string) => void;
  currency: string;
  onCurrencyChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  dueDateLabel?: string;
  dueDate?: string;
  onDueDateChange?: (value: string) => void;
  dueDateError?: string;
  clientType?: "pro" | "particulier";
  onClientTypeChange?: (value: "pro" | "particulier") => void;
}) {
  const dict = useDict();
  const f = dict.fusion.financeDocs;
  const {
    priceMode,
    setPriceMode,
    tvaRate,
    setTvaRate,
    canManageFinanceSettings,
  } = useFinanceSettings();

  const statusOptionLabel =
    statusOptions.find((opt) => opt.value === status)?.label ?? status;
  const tvaPct = Math.round(tvaRate * 1000) / 10;

  return (
    <section className="fl-form-section">
      <div className="fl-form-section__head">
        <SlidersHorizontal
          className="size-3.5 text-[var(--text-dim)]"
          strokeWidth={1.75}
        />
        <h4>{f.optionsPanel}</h4>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="fl-field">
          <label className="fl-field-label">{statusFieldLabel}</label>
          <Select value={status} onValueChange={(v) => v && onStatusChange(v)}>
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
        {onClientTypeChange && clientType ? (
          <div className="fl-field">
            <label className="fl-field-label">{f.clientType}</label>
            <Select
              value={clientType}
              onValueChange={(v) => {
                if (v === "pro" || v === "particulier") onClientTypeChange(v);
              }}
            >
              <SelectTrigger className="fl-select-trigger fl-input w-full">
                <SelectValue>
                  {clientType === "pro" ? f.clientPro : f.clientParticulier}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="fl-select-panel">
                <SelectItem value="pro">{f.clientPro}</SelectItem>
                <SelectItem value="particulier">
                  {f.clientParticulier}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="fl-field">
          <label className="fl-field-label">{f.priceMode}</label>
          {canManageFinanceSettings ? (
            <Select
              value={priceMode}
              onValueChange={(v) => {
                if (v === "ht" || v === "ttc") setPriceMode(v);
              }}
            >
              <SelectTrigger className="fl-select-trigger fl-input w-full">
                <SelectValue>
                  {priceMode === "ht" ? f.priceModeHt : f.priceModeTtc}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="fl-select-panel">
                <SelectItem value="ht">{f.priceModeHt}</SelectItem>
                <SelectItem value="ttc">{f.priceModeTtc}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="fl-input flex min-h-9 items-center px-3 text-sm">
              {priceMode === "ht" ? f.priceModeHt : f.priceModeTtc}
            </p>
          )}
        </div>
        <div className="fl-field">
          <label className="fl-field-label" htmlFor="fin-doc-tva-rate">
            {f.tvaRate}
          </label>
          {canManageFinanceSettings ? (
            <Input
              id="fin-doc-tva-rate"
              className="fl-input"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={tvaPct}
              onChange={(e) => {
                const pct = Number(e.target.value);
                if (Number.isNaN(pct)) return;
                setTvaRate(Math.min(100, Math.max(0, pct)) / 100);
              }}
            />
          ) : (
            <p className="fl-input flex min-h-9 items-center px-3 text-sm">
              {tvaPct} %
            </p>
          )}
        </div>
        {onDueDateChange ? (
          <div className="fl-field">
            <label className="fl-field-label" htmlFor="fin-doc-due-date">
              {dueDateLabel}
            </label>
            <Input
              id="fin-doc-due-date"
              className="fl-input"
              type="date"
              value={dueDate ?? ""}
              onChange={(e) => onDueDateChange(e.target.value)}
              aria-invalid={Boolean(dueDateError)}
            />
            {dueDateError ? (
              <p className="mt-1 text-xs font-medium text-[var(--rose)]">
                {dueDateError}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="fl-field sm:col-span-2 lg:col-span-1">
          <label className="fl-field-label" htmlFor="fin-doc-notes">
            {dict.common.notes}
          </label>
          <Input
            id="fin-doc-notes"
            className="fl-input"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}

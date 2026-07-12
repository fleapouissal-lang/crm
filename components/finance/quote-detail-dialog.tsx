"use client";

import { format } from "date-fns";
import { ExternalLink, Pencil, Receipt } from "lucide-react";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { QuotePdfExportButton } from "@/components/finance/pdf-export-button";
import {
  QUOTE_STATUS_BADGE,
  formatMoney,
  isQuoteExpiringSoon,
  quoteExpiryIso,
  type DocumentTemplate,
  type QuoteRecord,
} from "@/lib/finance/types";
import { renderQuoteTemplate } from "@/lib/finance/render-template";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function QuoteDetailDialog({
  open,
  onOpenChange,
  quote,
  template,
  onEdit,
  onViewPdf,
  onConvertToInvoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteRecord | null;
  template?: DocumentTemplate;
  onEdit: () => void;
  onViewPdf?: () => void;
  onConvertToInvoice?: () => void;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const q = dict.fusion.quotes;
  if (!quote) return null;

  const badge = QUOTE_STATUS_BADGE[quote.status];
  const expiry = quoteExpiryIso(quote);
  const expiring = isQuoteExpiringSoon(quote);
  const canConvert =
    Boolean(onConvertToInvoice) &&
    (quote.status === "accepted" || quote.status === "sent");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="fl-mono">{quote.number}</span>
            <span className={`fl-badge ${badge}`}>{q[quote.status]}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-4">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{q.client}</dt>
              <dd className="font-medium">{quote.clientName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{q.service}</dt>
              <dd className="max-w-[55%] text-right font-medium">
                {quote.service}
              </dd>
            </div>
            {quote.items?.length ? (
              <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-3">
                {quote.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="fl-tny fl-faint">
                        {item.quantity} × {formatMoney(item.unitPriceTtc, quote.currency)}
                      </p>
                    </div>
                    <p className="fl-mono shrink-0">
                      {formatMoney(
                        item.quantity * item.unitPriceTtc,
                        quote.currency
                      )}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{q.amount}</dt>
              <dd className="fl-mono font-medium">
                {formatMoney(quote.amount, quote.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{q.validity}</dt>
              <dd
                className={cn(
                  "text-right",
                  expiring && "text-[var(--rose)]"
                )}
              >
                <div>
                  {q.validityDaysUnit.replace(
                    "{n}",
                    String(quote.validityDays)
                  )}
                </div>
                <div className="fl-tny fl-faint">
                  {q.expiresOn.replace(
                    "{date}",
                    format(new Date(expiry + "T00:00:00"), "dd MMM yyyy", {
                      locale: dateLocale,
                    })
                  )}
                </div>
              </dd>
            </div>
            {template ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {dict.fusion.financeDocs.template}
                </dt>
                <dd className="text-right font-medium">{template.name}</dd>
              </div>
            ) : null}
          </dl>
          {template ? (
            <pre className="max-h-[240px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-4 text-xs leading-relaxed whitespace-pre-wrap">
              {renderQuoteTemplate(template.content, quote)}
            </pre>
          ) : null}
          {quote.notes ? (
            <p className="text-sm text-muted-foreground">{quote.notes}</p>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            {format(new Date(quote.updatedAt), "d MMM yyyy · HH:mm", {
              locale: dateLocale,
            })}
          </p>
        </div>
        <DialogFooter className="fl-dialog-footer flex-wrap gap-2">
          <button
            type="button"
            className="fl-btn sm ghost"
            onClick={() => onOpenChange(false)}
          >
            {dict.common.cancel}
          </button>
          {onViewPdf ? (
            <button type="button" className="fl-btn sm ghost" onClick={onViewPdf}>
              <ExternalLink className="size-4" />
              {q.viewPdf}
            </button>
          ) : null}
          <QuotePdfExportButton
            quote={quote}
            template={template}
            variant="ghost"
          />
          {canConvert ? (
            <button
              type="button"
              className="fl-btn sm ghost"
              onClick={onConvertToInvoice}
            >
              <Receipt className="size-4" />
              {q.convertToInvoice}
            </button>
          ) : null}
          <button type="button" className="fl-btn sm primary" onClick={onEdit}>
            <Pencil className="size-4" />
            {dict.common.edit}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

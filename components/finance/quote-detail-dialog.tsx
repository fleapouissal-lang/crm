"use client";

import { format } from "date-fns";
import { ExternalLink, Pencil, Receipt } from "lucide-react";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { FinanceDocumentPreview } from "@/components/finance/finance-document-preview";
import {
  QUOTE_STATUS_BADGE,
  isQuoteExpiringSoon,
  quoteExpiryIso,
  type DocumentTemplate,
  type QuoteRecord,
} from "@/lib/finance/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  const expiryLabel = q.expiresOn.replace(
    "{date}",
    format(new Date(expiry + "T00:00:00"), "dd MMM yyyy", {
      locale: dateLocale,
    })
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-2xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{q.detailTitle}</DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-3">
          <FinanceDocumentPreview
            kind="quote"
            number={quote.number}
            statusLabel={q[quote.status]}
            statusBadge={badge}
            clientName={quote.clientName}
            amount={quote.amount}
            currency={quote.currency}
            secondaryLabel={q.validity}
            secondaryValue={q.validityDaysUnit.replace(
              "{n}",
              String(quote.validityDays)
            )}
            lineItems={quote.items}
            templateName={template?.name}
          />

          {expiring ? (
            <p className="rounded-xl border border-[color-mix(in_oklch,var(--rose),transparent_65%)] bg-[color-mix(in_oklch,var(--rose),transparent_92%)] px-4 py-2.5 text-sm text-[var(--rose)]">
              {expiryLabel}
            </p>
          ) : null}

          {quote.notes ? (
            <p className="fl-lux-doc-notes">{quote.notes}</p>
          ) : null}
        </div>
        <DialogFooter className="fl-dialog-footer flex-wrap gap-2 sm:justify-end">
          {onViewPdf ? (
            <button type="button" className="fl-btn sm ghost" onClick={onViewPdf}>
              <ExternalLink className="size-4" />
              {q.viewPdf}
            </button>
          ) : null}
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

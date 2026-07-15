"use client";

import { format } from "date-fns";
import { ExternalLink, Pencil } from "lucide-react";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { InvoicePdfExportButton } from "@/components/finance/pdf-export-button";
import { FinanceDocumentPreview } from "@/components/finance/finance-document-preview";
import {
  INVOICE_STATUS_BADGE,
  type DocumentTemplate,
  type InvoiceRecord,
  type QuoteRecord,
} from "@/lib/finance/types";
import { renderInvoiceTemplate } from "@/lib/finance/render-template";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function statusLabel(
  inv: InvoiceRecord,
  labels: Record<string, string>
): string {
  if (inv.status === "overdue") return labels.overdueStatus;
  return labels[inv.status] as string;
}

export function InvoiceDetailDialog({
  open,
  onOpenChange,
  invoice,
  template,
  linkedQuote,
  onEdit,
  onViewPdf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceRecord | null;
  template?: DocumentTemplate;
  linkedQuote?: QuoteRecord;
  onEdit: () => void;
  onViewPdf?: () => void;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const inv = dict.fusion.invoices;
  if (!invoice) return null;

  const service = linkedQuote?.service || invoice.notes || "—";
  const badge = INVOICE_STATUS_BADGE[invoice.status];
  const items =
    invoice.items?.length
      ? invoice.items
      : linkedQuote?.items?.length
        ? linkedQuote.items
        : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-2xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{inv.detailTitle}</DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-4">
          <FinanceDocumentPreview
            kind="invoice"
            number={invoice.number}
            statusLabel={statusLabel(invoice, inv)}
            statusBadge={badge}
            clientName={invoice.clientName}
            amount={invoice.amount}
            currency={invoice.currency}
            secondaryLabel={inv.dueDate}
            secondaryValue={format(new Date(invoice.dueDate), "dd MMM yyyy", {
              locale: dateLocale,
            })}
            tertiaryLabel={dict.fusion.quotes.service}
            tertiaryValue={service}
            lineItems={items}
          />

          {template ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide fl-faint">
                {dict.fusion.financeDocs.template}: {template.name}
              </p>
              <pre className="max-h-[180px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-4 text-xs leading-relaxed whitespace-pre-wrap">
                {renderInvoiceTemplate(template.content, invoice, service)}
              </pre>
            </div>
          ) : null}

          {invoice.notes ? (
            <p className="text-sm fl-muted">{invoice.notes}</p>
          ) : null}
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
              {inv.viewPdf}
            </button>
          ) : null}
          <InvoicePdfExportButton
            invoice={invoice}
            template={template}
            linkedQuote={linkedQuote}
            variant="ghost"
          />
          <button type="button" className="fl-btn sm primary" onClick={onEdit}>
            <Pencil className="size-4" />
            {dict.common.edit}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

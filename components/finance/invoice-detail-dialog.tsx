"use client";

import { ExternalLink, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDict } from "@/components/shared/i18n-provider";
import { InvoicePdfExportButton } from "@/components/finance/pdf-export-button";
import { FinanceDocumentPreview } from "@/components/finance/finance-document-preview";
import { FinanceImportedFileViewer } from "@/components/finance/finance-imported-file-viewer";
import {
  INVOICE_STATUS_BADGE,
  isImportedFinanceDoc,
  type DocumentTemplate,
  type InvoiceRecord,
  type QuoteRecord,
} from "@/lib/finance/types";
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
  onEdit?: () => void;
  onViewPdf?: () => void;
}) {
  const dict = useDict();
  const router = useRouter();
  const inv = dict.fusion.invoices;
  if (!invoice) return null;

  const imported = isImportedFinanceDoc(invoice);
  const badge = INVOICE_STATUS_BADGE[invoice.status];
  const items =
    invoice.items?.length
      ? invoice.items
      : linkedQuote?.items?.length
        ? linkedQuote.items
        : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content fl-dialog-content--doc ring-0 max-h-[96vh]">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{inv.detailTitle}</DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body max-h-[min(78vh,880px)] overflow-y-auto px-4 py-3 sm:px-5">
          {imported ? (
            <FinanceImportedFileViewer
              kind="invoice"
              id={invoice.id}
              fileName={invoice.importFileName}
              mime={invoice.importFileMime}
            />
          ) : (
            <div className="fl-fin-editor">
              <div className="fl-fin-editor__stage">
                <FinanceDocumentPreview
                  kind="invoice"
                  number={invoice.number}
                  statusLabel={statusLabel(invoice, inv)}
                  statusBadge={badge}
                  isPaid={invoice.status === "paid"}
                  clientName={invoice.clientName}
                  clientDetails={invoice.clientDetails}
                  amount={invoice.amount}
                  currency={invoice.currency}
                  issuedAt={invoice.createdAt}
                  lineItems={items}
                  notes={invoice.notes}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="fl-dialog-footer flex-wrap gap-2">
          <button
            type="button"
            className="fl-btn sm ghost"
            onClick={() => onOpenChange(false)}
          >
            {dict.common.cancel}
          </button>
          {!imported && onViewPdf ? (
            <button type="button" className="fl-btn sm ghost" onClick={onViewPdf}>
              <ExternalLink className="size-4" />
              {inv.viewPdf}
            </button>
          ) : null}
          {!imported ? (
            <InvoicePdfExportButton
              invoice={invoice}
              template={template}
              linkedQuote={linkedQuote}
              variant="ghost"
            />
          ) : null}
          {!imported ? (
            <button
              type="button"
              className="fl-btn sm primary"
              onClick={() => {
                onOpenChange(false);
                if (onEdit) {
                  onEdit();
                  return;
                }
                router.push(`/finance/invoices/${invoice.id}/edit`);
              }}
            >
              <Pencil className="size-4" />
              {dict.common.edit}
            </button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

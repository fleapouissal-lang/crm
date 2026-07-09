"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Pencil } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import {
  INVOICE_STATUS_BADGE,
  formatMoney,
  type DocumentTemplate,
  type InvoiceRecord,
} from "@/lib/finance/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function renderTemplate(content: string, invoice: InvoiceRecord): string {
  return content
    .replace(/\{\{numero\}\}/g, invoice.number)
    .replace(/\{\{client\}\}/g, invoice.clientName)
    .replace(/\{\{montant\}\}/g, invoice.amount.toLocaleString("fr-FR"))
    .replace(/\{\{devise\}\}/g, invoice.currency)
    .replace(/\{\{echeance\}\}/g, invoice.dueDate)
    .replace(/\{\{prestation\}\}/g, invoice.notes || "—")
    .replace(/\{\{iban\}\}/g, "—");
}

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
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceRecord | null;
  template?: DocumentTemplate;
  onEdit: () => void;
}) {
  const dict = useDict();
  const inv = dict.fusion.invoices;
  if (!invoice) return null;

  const badge = INVOICE_STATUS_BADGE[invoice.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{invoice.number}</DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-4">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{inv.client}</dt>
              <dd className="font-medium">{invoice.clientName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{inv.amount}</dt>
              <dd className="fl-mono font-medium">{formatMoney(invoice.amount, invoice.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{inv.dueDate}</dt>
              <dd>
                {format(new Date(invoice.dueDate), "d MMM yyyy", { locale: fr })}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{inv.status}</dt>
              <dd>
                <span className={`fl-badge ${badge}`}>{statusLabel(invoice, inv)}</span>
              </dd>
            </div>
            {template ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{dict.fusion.financeDocs.template}</dt>
                <dd className="text-right font-medium">{template.name}</dd>
              </div>
            ) : null}
          </dl>
          {template ? (
            <pre className="max-h-[240px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-4 text-xs leading-relaxed whitespace-pre-wrap">
              {renderTemplate(template.content, invoice)}
            </pre>
          ) : null}
          {invoice.notes ? (
            <p className="text-sm text-muted-foreground">{invoice.notes}</p>
          ) : null}
        </div>
        <DialogFooter className="fl-dialog-footer">
          <button type="button" className="fl-btn sm ghost" onClick={() => onOpenChange(false)}>
            {dict.common.cancel}
          </button>
          <button type="button" className="fl-btn sm primary" onClick={onEdit}>
            <Pencil className="size-4" />
            {dict.common.edit}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

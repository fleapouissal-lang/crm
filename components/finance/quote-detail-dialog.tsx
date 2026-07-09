"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Pencil } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { QuotePdfExportButton } from "@/components/finance/pdf-export-button";
import {
  QUOTE_STATUS_BADGE,
  formatMoney,
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

export function QuoteDetailDialog({
  open,
  onOpenChange,
  quote,
  template,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteRecord | null;
  template?: DocumentTemplate;
  onEdit: () => void;
}) {
  const dict = useDict();
  const q = dict.fusion.quotes;
  if (!quote) return null;

  const badge = QUOTE_STATUS_BADGE[quote.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{quote.number}</DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-4">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{q.client}</dt>
              <dd className="font-medium">{quote.clientName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{q.service}</dt>
              <dd className="max-w-[55%] text-right font-medium">{quote.service}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{q.amount}</dt>
              <dd className="fl-mono font-medium">{formatMoney(quote.amount, quote.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{q.validity}</dt>
              <dd>{quote.validityDays} j</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{q.status}</dt>
              <dd>
                <span className={`fl-badge ${badge}`}>{q[quote.status]}</span>
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
              {renderQuoteTemplate(template.content, quote)}
            </pre>
          ) : null}
          {quote.notes ? (
            <p className="text-sm text-muted-foreground">{quote.notes}</p>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            {format(new Date(quote.updatedAt), "d MMM yyyy · HH:mm", { locale: fr })}
          </p>
        </div>
        <DialogFooter className="fl-dialog-footer">
          <button type="button" className="fl-btn sm ghost" onClick={() => onOpenChange(false)}>
            {dict.common.cancel}
          </button>
          <QuotePdfExportButton quote={quote} template={template} variant="ghost" />
          <button type="button" className="fl-btn sm primary" onClick={onEdit}>
            <Pencil className="size-4" />
            {dict.common.edit}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

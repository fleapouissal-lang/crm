"use client";

import { Pencil } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import type { DocumentTemplate } from "@/lib/finance/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TemplateDetailDialog({
  open,
  onOpenChange,
  template,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplate | null;
  onEdit: () => void;
}) {
  const dict = useDict();
  const f = dict.fusion.financeDocs;
  if (!template) return null;

  const kindLabel = template.kind === "quote" ? f.kindQuote : f.kindInvoice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{template.name}</DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-4">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{f.templateKind}</dt>
              <dd>
                <span className="fl-badge b-gold">{kindLabel}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{dict.common.description}</dt>
              <dd className="max-w-[60%] text-right font-medium">{template.description || "—"}</dd>
            </div>
          </dl>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {f.templateBody}
            </p>
            <pre className="max-h-[280px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-4 text-xs leading-relaxed whitespace-pre-wrap">
              {template.content}
            </pre>
          </div>
          {template.footerNote ? (
            <p className="text-xs text-muted-foreground">{template.footerNote}</p>
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

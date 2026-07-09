"use client";

import { useTransition } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { downloadInvoicePdf, downloadQuotePdf } from "@/lib/finance/pdf/build-finance-pdf";
import type { DocumentTemplate, InvoiceRecord, QuoteRecord } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

export function QuotePdfExportButton({
  quote,
  template,
  className,
  variant = "primary",
}: {
  quote: QuoteRecord;
  template?: DocumentTemplate;
  className?: string;
  variant?: "primary" | "ghost";
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const f = dict.fusion.financeDocs;
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={cn("fl-btn sm", variant === "primary" ? "primary" : "ghost", className)}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await downloadQuotePdf(quote, template, locale);
            toast.success(f.pdfSuccess);
          } catch {
            toast.error(f.pdfError);
          }
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      {dict.fusion.labels.exportPdf}
    </button>
  );
}

export function InvoicePdfExportButton({
  invoice,
  template,
  linkedQuote,
  className,
  variant = "primary",
}: {
  invoice: InvoiceRecord;
  template?: DocumentTemplate;
  linkedQuote?: QuoteRecord;
  className?: string;
  variant?: "primary" | "ghost";
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const f = dict.fusion.financeDocs;
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={cn("fl-btn sm", variant === "primary" ? "primary" : "ghost", className)}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await downloadInvoicePdf(invoice, template, linkedQuote, locale);
            toast.success(f.pdfSuccess);
          } catch {
            toast.error(f.pdfError);
          }
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      {dict.fusion.labels.exportPdf}
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Eye, FileDown, Loader2 } from "lucide-react";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { useOrgIssuer } from "@/components/finance/org-issuer-provider";
import {
  buildInvoicePdfBytes,
  buildQuotePdfBytes,
  downloadPdfBytes,
} from "@/lib/finance/pdf/build-finance-pdf";
import type {
  DocumentTemplate,
  InvoiceRecord,
  QuoteRecord,
} from "@/lib/finance/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function toBlobPart(bytes: Uint8Array): BlobPart {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as BlobPart;
}

export function FinancePdfDialog({
  open,
  onOpenChange,
  kind,
  quote,
  invoice,
  template,
  linkedQuote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "quote" | "invoice";
  quote?: QuoteRecord | null;
  invoice?: InvoiceRecord | null;
  template?: DocumentTemplate;
  linkedQuote?: QuoteRecord;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const issuer = useOrgIssuer();
  const f = dict.fusion.financeDocs;
  const title =
    kind === "quote"
      ? dict.fusion.quotes.viewPdf
      : dict.fusion.invoices.viewPdf;
  const number =
    kind === "quote" ? quote?.number : invoice?.number;
  const clientName =
    kind === "quote" ? quote?.clientName : invoice?.clientName;

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordId = kind === "quote" ? quote?.id : invoice?.id;

  useEffect(() => {
    if (!open || !recordId) {
      setPdfBytes(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setPdfBytes(null);
    setError(null);

    const run =
      kind === "quote" && quote
        ? buildQuotePdfBytes(quote, template, locale, issuer)
        : kind === "invoice" && invoice
          ? buildInvoicePdfBytes(
              invoice,
              template,
              linkedQuote,
              locale,
              issuer
            )
          : Promise.reject(new Error("missing record"));

    void run
      .then((bytes) => {
        if (!cancelled) setPdfBytes(bytes);
      })
      .catch(() => {
        if (!cancelled) setError(f.pdfError);
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    recordId,
    kind,
    quote,
    invoice,
    template,
    linkedQuote,
    locale,
    issuer,
    f.pdfError,
  ]);

  useEffect(() => {
    if (!pdfBytes) {
      setUrl(null);
      return;
    }
    const blob = new Blob([toBlobPart(pdfBytes)], { type: "application/pdf" });
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [pdfBytes]);

  if (kind === "quote" && !quote) return null;
  if (kind === "invoice" && !invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content max-h-[96vh] w-[min(96vw,72rem)] sm:max-w-6xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#111114] text-white">
              <Eye className="size-5" strokeWidth={2} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span>{title}</span>
              <span className="truncate text-xs font-normal fl-faint fl-mono">
                {number}
                {clientName ? ` · ${clientName}` : ""}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="fl-dialog-body min-h-[62vh] p-0 sm:p-0">
          {error ? (
            <div className="flex min-h-[62vh] items-center justify-center px-6">
              <p className="text-sm fl-faint">{error}</p>
            </div>
          ) : !url ? (
            <div className="flex min-h-[62vh] flex-col items-center justify-center gap-3">
              <Loader2 className="size-7 animate-spin text-[var(--text-dim)]" />
              <p className="text-sm fl-faint">{f.pdfLoading}</p>
            </div>
          ) : (
            <div className="fl-finance-pdf-frame h-[min(78vh,860px)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
              <object
                data={`${url}#toolbar=1&navpanes=0`}
                type="application/pdf"
                className="h-full w-full"
              >
                <iframe
                  src={`${url}#toolbar=1&navpanes=0`}
                  title={number ?? "PDF"}
                  className="h-full w-full border-0"
                />
              </object>
            </div>
          )}
        </div>

        <DialogFooter className="fl-dialog-footer">
          <button
            type="button"
            className="fl-btn ghost"
            onClick={() => onOpenChange(false)}
          >
            {dict.common.cancel}
          </button>
          <button
            type="button"
            className="fl-btn primary"
            disabled={!pdfBytes || !number}
            onClick={() =>
              pdfBytes && number && downloadPdfBytes(pdfBytes, `${number}.pdf`)
            }
          >
            <FileDown className="size-4" />
            {dict.fusion.labels.exportPdf}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

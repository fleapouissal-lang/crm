"use client";

import { useEffect, useState } from "react";
import { Eye, FileDown, Loader2 } from "lucide-react";
import {
  buildPlatformQuotePdfBytes,
  downloadPdfBytes,
} from "@/lib/billing/build-platform-quote-pdf";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlatformQuote } from "@/types/database";

function toBlobPart(bytes: Uint8Array): BlobPart {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as BlobPart;
}

export function PlatformQuotePdfDialog({
  open,
  onOpenChange,
  quote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: PlatformQuote | null;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const b = dict.fusion.platformBilling;
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !quote) {
      setPdfBytes(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setPdfBytes(null);
    setError(null);

    void buildPlatformQuotePdfBytes(quote, locale)
      .then((bytes) => {
        if (!cancelled) setPdfBytes(bytes);
      })
      .catch(() => {
        if (!cancelled) setError(b.quotePdfError);
      });

    return () => {
      cancelled = true;
    };
  }, [open, quote, locale, b.quotePdfError]);

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

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content max-h-[92vh] sm:max-w-4xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl text-white"
              style={{ background: "var(--grad-brand)" }}
            >
              <Eye className="size-5" strokeWidth={2} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span>{b.viewQuotePdf}</span>
              <span className="truncate text-xs font-normal fl-faint fl-mono">
                {quote.number}
                {quote.organization?.name ? ` · ${quote.organization.name}` : ""}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="fl-dialog-body min-h-[55vh] p-0 sm:p-0">
          {error ? (
            <div className="flex min-h-[55vh] items-center justify-center px-6">
              <p className="text-sm fl-faint">{error}</p>
            </div>
          ) : !url ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3">
              <Loader2 className="size-7 animate-spin text-[var(--text-dim)]" />
              <p className="text-sm fl-faint">{b.quotePdfLoading}</p>
            </div>
          ) : (
            <div className="fl-finance-pdf-frame h-[min(70vh,720px)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
              <object
                data={`${url}#toolbar=1&navpanes=0`}
                type="application/pdf"
                className="h-full w-full"
              >
                <iframe
                  src={`${url}#toolbar=1&navpanes=0`}
                  title={quote.number}
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
            disabled={!pdfBytes}
            onClick={() =>
              pdfBytes && downloadPdfBytes(pdfBytes, `${quote.number}.pdf`)
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

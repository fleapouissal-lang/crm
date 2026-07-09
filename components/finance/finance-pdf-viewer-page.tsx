"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, FileDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import {
  buildInvoicePdfBytes,
  buildQuotePdfBytes,
  downloadPdfBytes,
} from "@/lib/finance/pdf/build-finance-pdf";
import {
  loadInvoices,
  loadQuotes,
  loadTemplates,
} from "@/lib/finance/storage";

function toBlobPart(bytes: Uint8Array): BlobPart {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as BlobPart;
}

export function FinancePdfViewerPage({
  kind,
  id,
}: {
  kind: "quote" | "invoice";
  id: string;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const f = dict.fusion.financeDocs;
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const backHref = kind === "quote" ? "/finance/quotes" : "/finance/invoices";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setPdfBytes(null);
      setUrl(null);

      try {
        if (kind === "quote") {
          const quote = loadQuotes().find((row) => row.id === id);
          if (!quote) {
            setError(f.documentNotFound);
            return;
          }
          const tpl = quote.templateId
            ? loadTemplates().find((t) => t.id === quote.templateId)
            : undefined;
          const bytes = await buildQuotePdfBytes(quote, tpl, locale);
          if (cancelled) return;
          setPdfBytes(bytes);
          setTitle(quote.number);
          return;
        }

        const invoice = loadInvoices().find((row) => row.id === id);
        if (!invoice) {
          setError(f.documentNotFound);
          return;
        }
        const templates = loadTemplates();
        const tpl = invoice.templateId
          ? templates.find((t) => t.id === invoice.templateId)
          : undefined;
        const linked = invoice.quoteId
          ? loadQuotes().find((q) => q.id === invoice.quoteId)
          : undefined;
        const bytes = await buildInvoicePdfBytes(invoice, tpl, linked, locale);
        if (cancelled) return;
        setPdfBytes(bytes);
        setTitle(invoice.number);
      } catch {
        if (!cancelled) setError(f.pdfError);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [kind, id, locale, f.documentNotFound, f.pdfError]);

  useEffect(() => {
    if (!pdfBytes) {
      setUrl(null);
      return;
    }
    const blob = new Blob([toBlobPart(pdfBytes)], { type: "application/pdf" });
    const nextUrl = URL.createObjectURL(blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [pdfBytes]);

  const filename = title ? `${title}.pdf` : "document.pdf";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-100">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={backHref}
            className="fl-btn sm ghost shrink-0"
            aria-label={dict.common.back}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{dict.common.back}</span>
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {kind === "quote" ? f.kindQuote : f.kindInvoice}
            </p>
            <h1 className="truncate text-base font-semibold text-neutral-900">
              {title || "…"}
            </h1>
          </div>
        </div>
        <button
          type="button"
          className="fl-btn sm primary shrink-0"
          disabled={!pdfBytes}
          onClick={() => pdfBytes && downloadPdfBytes(pdfBytes, filename)}
        >
          <FileDown className="size-4" />
          {dict.fusion.labels.exportPdf}
        </button>
      </header>

      <main className="min-h-0 flex-1 bg-neutral-200 p-2 sm:p-4">
        {error ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-xl border border-neutral-200 bg-white px-6 py-8 text-center shadow-sm">
              <p className="text-sm text-neutral-600">{error}</p>
              <Link href={backHref} className="fl-btn sm primary mt-4 inline-flex">
                {dict.common.back}
              </Link>
            </div>
          </div>
        ) : !url ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-neutral-600">
              <Loader2 className="size-8 animate-spin text-neutral-900" />
              <p className="text-sm">{f.pdfLoading}</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm">
            <object
              data={`${url}#toolbar=1&navpanes=0`}
              type="application/pdf"
              className="h-full w-full"
            >
              <iframe
                src={`${url}#toolbar=1&navpanes=0`}
                title={title}
                className="h-full w-full border-0"
              />
            </object>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { useOrgIssuer } from "@/components/finance/org-issuer-provider";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getInvoices, getQuotes } from "@/lib/actions/finance-docs";
import { matchClientFinanceDocs, journalFilename } from "@/lib/clients/journal";
import {
  buildClientJournalPdfBytes,
} from "@/lib/clients/pdf/build-client-journal-pdf";
import { downloadPdfBytes } from "@/lib/finance/pdf/build-finance-pdf";
import type { ClientRecord } from "@/lib/clients/types";

function toBlobPart(bytes: Uint8Array): BlobPart {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as BlobPart;
}

export function ClientJournalPdfDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRecord | null;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const issuer = useOrgIssuer();
  const cl = dict.clients;
  const statusLabel = client
    ? dict.fusion.badges[client.statusKey] ?? client.statusKey
    : "";

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !client) {
      setPdfBytes(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setPdfBytes(null);
    setError(null);

    void Promise.all([getQuotes(), getInvoices()])
      .then(([quotes, invoices]) => {
        const matched = matchClientFinanceDocs(client, quotes, invoices);
        return buildClientJournalPdfBytes({
          client,
          statusLabel,
          quotes: matched.quotes,
          invoices: matched.invoices,
          locale,
          issuer,
        });
      })
      .then((bytes) => {
        if (!cancelled) setPdfBytes(bytes);
      })
      .catch(() => {
        if (!cancelled) setError(cl.journalPdfError);
      });

    return () => {
      cancelled = true;
    };
  }, [open, client, statusLabel, locale, issuer, cl.journalPdfError]);

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

  if (!client) return null;

  const filename = journalFilename(client.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content max-h-[96vh] w-[min(96vw,72rem)] sm:max-w-6xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#111114] text-white">
              <FileText className="size-5" strokeWidth={2} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span>{cl.journalPdf}</span>
              <span className="truncate text-xs font-normal fl-faint fl-mono">
                {client.name}
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
              <p className="text-sm fl-faint">{cl.journalPdfLoading}</p>
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
                  title={filename}
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
            onClick={() => pdfBytes && downloadPdfBytes(pdfBytes, filename)}
          >
            <FileDown className="size-4" />
            {dict.fusion.labels.exportPdf}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { getFinanceImportSignedUrl } from "@/lib/actions/finance-docs";

export function FinanceImportedFileViewer({
  kind,
  id,
  fileName,
  mime,
}: {
  kind: "quote" | "invoice";
  id: string;
  fileName?: string | null;
  mime?: string | null;
}) {
  const dict = useDict();
  const f = dict.fusion.financeDocs;
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getFinanceImportSignedUrl(kind, id).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
        setUrl(null);
      } else {
        setUrl(result.data);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  const isPdf =
    (mime ?? "").includes("pdf") ||
    (fileName ?? "").toLowerCase().endsWith(".pdf");

  return (
    <div className="fl-fin-editor">
      <div className="fl-fin-editor__stage space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#d4d4d8] bg-white px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-[var(--text-dim)]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {fileName || f.importedFile}
              </p>
              <p className="text-xs fl-faint">{f.importedReadOnly}</p>
            </div>
          </div>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="fl-btn sm ghost shrink-0"
            >
              <ExternalLink className="size-3.5" />
              {f.openImportedFile}
            </a>
          ) : null}
        </div>

        {loading ? (
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-[#d4d4d8] bg-white">
            <Loader2 className="size-6 animate-spin text-[var(--text-dim)]" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-[color-mix(in_oklch,var(--rose),transparent_65%)] bg-[color-mix(in_oklch,var(--rose),transparent_92%)] px-4 py-3 text-sm text-[var(--rose)]">
            {error}
          </div>
        ) : url && isPdf ? (
          <iframe
            title={fileName || f.importedFile}
            src={url}
            className="h-[min(70vh,760px)] w-full rounded-lg border border-[#d4d4d8] bg-white"
          />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={fileName || f.importedFile}
            className="mx-auto max-h-[min(70vh,760px)] w-auto max-w-full rounded-lg border border-[#d4d4d8] bg-white object-contain"
          />
        ) : null}
      </div>
    </div>
  );
}

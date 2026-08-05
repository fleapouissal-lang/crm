"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { importFinanceDocuments } from "@/lib/actions/finance-docs";
import { cn } from "@/lib/utils";

export function FinanceImportButton({
  kind,
  onImported,
  className,
}: {
  kind: "quote" | "invoice";
  onImported?: () => void;
  className?: string;
}) {
  const dict = useDict();
  const f = dict.fusion.financeDocs;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const formData = new FormData();
    Array.from(fileList).forEach((file) => formData.append("files", file));
    setUploading(true);
    try {
      const result = await importFinanceDocuments(kind, formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        f.importSuccess.replace("{n}", String(result.data.count))
      );
      onImported?.();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,application/pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <button
        type="button"
        className={cn("fl-btn sm ghost shrink-0", className)}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        title={f.importFiles}
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
        ) : (
          <Upload className="size-3.5" strokeWidth={2} />
        )}
        <span className="hidden sm:inline">{f.importFiles}</span>
      </button>
    </>
  );
}

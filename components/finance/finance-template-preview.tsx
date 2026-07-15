"use client";

import { FileText } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

/** Compact template chip — no raw template body dump. */
export function FinanceTemplatePreview({
  name,
  description,
  className,
}: {
  name: string;
  description?: string;
  /** @deprecated kept for call-site compatibility; not rendered */
  content?: string;
  className?: string;
}) {
  const dict = useDict();
  const f = dict.fusion.financeDocs;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] px-3.5 py-3",
        className
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--glass-solid)] text-[var(--text-dim)]">
        <FileText className="size-3.5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="fl-tny font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
          {f.template}
        </p>
        <p className="truncate text-sm font-medium text-[var(--text)]">{name}</p>
        {description ? (
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug fl-faint">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

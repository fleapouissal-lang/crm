"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

type DataPaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function DataPagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  className,
}: DataPaginationProps) {
  const dict = useDict();
  const { locale } = useI18n();
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => {
      const first = Math.min(
        Math.max(1, page - 2),
        Math.max(1, totalPages - 4)
      );
      return first + index;
    }
  );

  const isRtl = locale === "ar";

  return (
    <nav
      className={cn(
        "flex min-h-[3.5rem] flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[color-mix(in_oklch,var(--glass-hi)_48%,transparent)] px-4 py-3",
        className
      )}
      aria-label={dict.common.pagination}
    >
      <p className="m-0 text-xs font-semibold tabular-nums text-[var(--text-faint)]">
        {dict.common.paginationRange
          .replace("{start}", String(start))
          .replace("{end}", String(end))
          .replace("{total}", String(totalItems))}
      </p>

      {totalPages > 1 ? (
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--glass)] text-[var(--text-dim)] transition hover:border-[color-mix(in_oklch,var(--brand-orange)_45%,var(--border))] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-35"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={dict.common.previousPage}
          >
            {isRtl ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>

          <div className="hidden items-center gap-1.5 sm:flex">
            {pages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition",
                  pageNumber === page
                    ? "border-transparent bg-[var(--grad-brand)] text-white shadow-[0_8px_18px_-12px_var(--brand-orange)]"
                    : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-dim)] hover:border-[color-mix(in_oklch,var(--brand-orange)_45%,var(--border))] hover:text-[var(--text)]"
                )}
                aria-current={pageNumber === page ? "page" : undefined}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--glass)] text-[var(--text-dim)] transition hover:border-[color-mix(in_oklch,var(--brand-orange)_45%,var(--border))] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-35"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label={dict.common.nextPage}
          >
            {isRtl ? (
              <ChevronLeft className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        </div>
      ) : null}
    </nav>
  );
}

"use client";

import {
  STAGIAIRE_ALWAYS_PAGES,
  STAGIAIRE_TOGGLE_PAGES,
  type MemberPageNavKey,
} from "@/lib/organizations/job-role-access";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

function pageLabel(
  dict: ReturnType<typeof useDict>,
  page: MemberPageNavKey
): string {
  return dict.nav[page] ?? page;
}

export function StagiairePagesPicker({
  value,
  onChange,
  className,
}: {
  /** Enabled toggleable pages (clients / projects / tasks / calendar). */
  value: MemberPageNavKey[];
  onChange: (next: MemberPageNavKey[]) => void;
  className?: string;
}) {
  const dict = useDict();
  const s = dict.fusion.settings;

  function toggle(page: MemberPageNavKey) {
    if (value.includes(page)) {
      onChange(value.filter((p) => p !== page));
    } else {
      onChange([...value, page]);
    }
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] px-3 py-2.5",
        className
      )}
    >
      <div>
        <p className="text-[12.5px] font-medium text-[var(--text)]">
          {s.jobAccessPersonalizedLabel}
        </p>
        <p className="mt-0.5 text-[11px] fl-faint">{s.stagiairePagesHint}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STAGIAIRE_ALWAYS_PAGES.map((page) => (
          <span
            key={page}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-[11px] fl-faint"
            title={s.stagiairePageAlwaysOn}
          >
            {pageLabel(dict, page)}
          </span>
        ))}
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {STAGIAIRE_TOGGLE_PAGES.map((page) => {
          const checked = value.includes(page);
          const id = `stagiaire-page-${page}`;
          return (
            <label
              key={page}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[12.5px] transition",
                checked
                  ? "border-[var(--iris)] bg-[color-mix(in_oklch,var(--iris),transparent_92%)] text-[var(--text)]"
                  : "border-[var(--border)] bg-[var(--bg)] fl-muted"
              )}
            >
              <input
                id={id}
                type="checkbox"
                className="size-3.5 accent-[var(--iris)]"
                checked={checked}
                onChange={() => toggle(page)}
              />
              <span>{pageLabel(dict, page)}</span>
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          className="fl-btn sm ghost"
          onClick={() => onChange([...STAGIAIRE_TOGGLE_PAGES])}
        >
          {s.stagiairePagesSelectAll}
        </button>
        <button
          type="button"
          className="fl-btn sm ghost"
          onClick={() => onChange([])}
        >
          {s.stagiairePagesClearAll}
        </button>
      </div>
    </div>
  );
}

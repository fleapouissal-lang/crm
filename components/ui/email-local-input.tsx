"use client";

import { cn } from "@/lib/utils";

/**
 * One input shell: type local part only, @domain is fixed on the right.
 */
export function EmailLocalInput({
  value,
  onChange,
  domain,
  id,
  placeholder = "prenom",
  className,
  disabled,
}: {
  value: string;
  onChange: (local: string) => void;
  domain: string | null | undefined;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const cleanDomain = (domain ?? "entreprise.com").replace(/^@+/, "");

  function handleChange(raw: string) {
    onChange(
      raw
        .replace(/@.*$/s, "")
        .replace(/\s+/g, "")
        .toLowerCase()
    );
  }

  return (
    <div
      className={cn(
        "flex h-[3.15rem] w-full min-w-0 items-center overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--glass-hi)] transition-[border-color,box-shadow]",
        "focus-within:border-[color-mix(in_oklch,var(--brand-orange,#ff7a3d),transparent_40%)] focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--brand-orange,#ff7a3d),transparent_88%)]",
        "hover:border-[var(--border-hi)]",
        disabled && "pointer-events-none opacity-60",
        className
      )}
    >
      <input
        id={id}
        type="text"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-[0.9375rem] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
      />
      <span
        className="pointer-events-none flex h-full shrink-0 select-none items-center border-s border-[var(--border)] bg-black/10 px-3 text-[0.875rem] text-[var(--text-faint)] dark:bg-white/5"
        aria-hidden
      >
        @{cleanDomain}
      </span>
    </div>
  );
}

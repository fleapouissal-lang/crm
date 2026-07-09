"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { setLocale } from "@/lib/actions/locale";
import type { Locale } from "@/lib/i18n/types";
import { useI18n } from "@/components/shared/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALE_OPTIONS: {
  key: Locale;
  code: string;
  label: string;
  flag: string;
}[] = [
  { key: "fr", code: "FR", label: "Français", flag: "🇫🇷" },
  { key: "en", code: "EN", label: "English", flag: "🇬🇧" },
  { key: "ar", code: "AR", label: "العربية", flag: "🇲🇦" },
];

function localeLabel(key: Locale) {
  return LOCALE_OPTIONS.find((o) => o.key === key)?.label ?? key;
}

export function LocaleSwitcher({
  variant = "select",
}: {
  variant?: "default" | "icon" | "select";
}) {
  const { locale, dict } = useI18n();
  const [pending, startTransition] = useTransition();
  const current = LOCALE_OPTIONS.find((o) => o.key === locale) ?? LOCALE_OPTIONS[0]!;

  function changeLocale(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
    });
  }

  if (variant === "select") {
    return (
      <Select
        value={locale}
        disabled={pending}
        onValueChange={(v) => changeLocale((v ?? locale) as Locale)}
      >
        <SelectTrigger
          className="fusion-locale-select fl-select-trigger"
          aria-label={dict.common.language}
        >
          <Languages className="fusion-locale-select__icon size-4 shrink-0" strokeWidth={1.75} />
          <SelectValue placeholder={localeLabel(locale)}>
            <span className="fusion-locale-select__value">
              <span className="fusion-locale-select__flag" aria-hidden>
                {current.flag}
              </span>
              <span>{current.label}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="fl-select-panel fusion-locale-select-panel">
          {LOCALE_OPTIONS.map((opt) => (
            <SelectItem key={opt.key} value={opt.key}>
              <span className="fusion-locale-select__option">
                <span className="fusion-locale-select__flag" aria-hidden>
                  {opt.flag}
                </span>
                <span>{opt.label}</span>
                <span className="fusion-locale-select__code">{opt.code}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        className="fusion-icon-btn"
        disabled={pending}
        aria-label={dict.common.language}
      >
        <Languages strokeWidth={2} />
      </button>
    ) : (
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label={dict.common.language}
      />
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger}>
        {variant === "default" && <Languages className="size-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[100]">
        {LOCALE_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.key}
            onClick={() => changeLocale(opt.key)}
            className={locale === opt.key ? "bg-accent" : undefined}
          >
            <span className="mr-2">{opt.flag}</span>
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

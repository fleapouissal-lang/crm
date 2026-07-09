import { ar, enUS, fr } from "date-fns/locale";
import type { Locale } from "./types";

export function getDateFnsLocale(locale: Locale) {
  switch (locale) {
    case "fr":
      return fr;
    case "ar":
      return ar;
    default:
      return enUS;
  }
}

export function getIntlLocale(locale: Locale): string {
  switch (locale) {
    case "fr":
      return "fr-FR";
    case "ar":
      return "ar-MA";
    default:
      return "en-US";
  }
}

export function isRtlLocale(locale: Locale): boolean {
  return locale === "ar";
}

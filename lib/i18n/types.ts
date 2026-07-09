export type { Dictionary } from "./dictionaries/en";
export type Locale = "en" | "fr" | "ar";

export const locales: Locale[] = ["en", "fr", "ar"];
export const defaultLocale: Locale = "fr";

export const LOCALE_COOKIE = "fusion-leap-locale";

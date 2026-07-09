import { cookies } from "next/headers";
import type { Locale } from "./types";
import { defaultLocale, LOCALE_COOKIE, locales } from "./types";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  if (value && locales.includes(value as Locale)) {
    return value as Locale;
  }
  return defaultLocale;
}

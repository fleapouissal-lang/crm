import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/locale";

export async function getLocalizedDict() {
  const locale = await getLocale();
  return getDictionary(locale);
}

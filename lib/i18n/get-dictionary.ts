import type { Locale, Dictionary } from "./types";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.en),
  fr: () => import("./dictionaries/fr").then((m) => m.fr as Dictionary),
  ar: () => import("./dictionaries/ar").then((m) => m.ar as Dictionary),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

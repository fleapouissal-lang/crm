export const ACTIVITY_DOMAIN_KEYS = [
  "digital",
  "transport_logistics",
  "retail_commerce",
  "industry_manufacturing",
  "construction",
  "finance_insurance",
  "health",
  "education",
  "tourism_hospitality",
  "agriculture",
  "energy",
  "telecom",
  "real_estate",
  "consulting_services",
  "other",
] as const;

export type ActivityDomainKey = (typeof ACTIVITY_DOMAIN_KEYS)[number];

export const COUNTRY_OPTIONS = [
  {
    code: "MA",
    cities: [
      "casablanca",
      "rabat",
      "marrakech",
      "fes",
      "tanger",
      "agadir",
      "meknes",
      "oujda",
      "kenitra",
      "tetouan",
      "sale",
      "mohammedia",
      "el_jadida",
      "nador",
    ],
  },
  {
    code: "FR",
    cities: ["paris", "lyon", "marseille", "toulouse", "lille", "bordeaux", "nantes", "nice"],
  },
  {
    code: "AE",
    cities: ["dubai", "abu_dhabi", "sharjah"],
  },
  {
    code: "SA",
    cities: ["riyadh", "jeddah", "dammam"],
  },
  {
    code: "TN",
    cities: ["tunis", "sfax", "sousse"],
  },
  {
    code: "DZ",
    cities: ["algiers", "oran", "constantine"],
  },
  {
    code: "SN",
    cities: ["dakar", "thies"],
  },
  {
    code: "BE",
    cities: ["brussels", "antwerp", "liege"],
  },
  {
    code: "CA",
    cities: ["montreal", "toronto", "quebec"],
  },
] as const;

export type CountryCode = (typeof COUNTRY_OPTIONS)[number]["code"];

export function getCitiesForCountry(country: string): readonly string[] {
  const match = COUNTRY_OPTIONS.find((c) => c.code === country);
  return match?.cities ?? [];
}

/** Map legacy free-text values to option keys when possible. */
export function normalizeActivityDomain(value: string | null | undefined): string {
  if (!value) return "";
  const raw = value.trim();
  if ((ACTIVITY_DOMAIN_KEYS as readonly string[]).includes(raw)) return raw;
  const map: Record<string, ActivityDomainKey> = {
    digital: "digital",
    numérique: "digital",
    numerique: "digital",
    transport: "transport_logistics",
    logistique: "transport_logistics",
    retail: "retail_commerce",
    commerce: "retail_commerce",
    industrie: "industry_manufacturing",
    construction: "construction",
    finance: "finance_insurance",
    santé: "health",
    sante: "health",
    education: "education",
    éducation: "education",
    tourisme: "tourism_hospitality",
    agriculture: "agriculture",
    énergie: "energy",
    energie: "energy",
    telecom: "telecom",
    télécom: "telecom",
    immobilier: "real_estate",
    conseil: "consulting_services",
    consulting: "consulting_services",
  };
  const key = map[raw.toLowerCase()];
  return key ?? "";
}

export function normalizeCountry(value: string | null | undefined): string {
  if (!value) return "";
  const raw = value.trim();
  if (COUNTRY_OPTIONS.some((c) => c.code === raw)) return raw;
  const map: Record<string, CountryCode> = {
    maroc: "MA",
    morocco: "MA",
    "المغرب": "MA",
    france: "FR",
    "emirats arabes unis": "AE",
    uae: "AE",
    "united arab emirates": "AE",
    "arabie saoudite": "SA",
    "saudi arabia": "SA",
    tunisie: "TN",
    tunisia: "TN",
    algerie: "DZ",
    algérie: "DZ",
    algeria: "DZ",
    senegal: "SN",
    sénégal: "SN",
    belgique: "BE",
    belgium: "BE",
    canada: "CA",
  };
  return map[raw.toLowerCase()] ?? "";
}

export function normalizeCity(
  value: string | null | undefined,
  country: string
): string {
  if (!value) return "";
  const raw = value.trim();
  const cities = getCitiesForCountry(country);
  if (cities.includes(raw)) return raw;
  const slug = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
  if (cities.includes(slug)) return slug;
  return "";
}

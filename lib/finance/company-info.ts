/** Fallback used only when no tenant organization is available (platform tools). */
export const FUSION_COMPANY = {
  name: "Fusion Leap",
  legalForm: "SARL AU",
  addressLine1: "123 Boulevard Zerktouni",
  addressLine2: "Casablanca 20100",
  country: "Maroc",
  ice: "ICE 000000000000000",
  rc: "RC 123456",
  taxId: "IF 12345678",
  capital: "Capital 100 000 MAD",
  phone: "+212 6 00 00 00 00",
  email: "contact@fusionleap.ma",
  website: "www.fusionleap.ma",
  iban: "MA00 0000 0000 0000 0000 0000",
  bank: "Bank of Africa",
  tvaRate: 0.2,
  logoPath: "/brand/fusion-leap-logo-dark.png",
} as const;

/** Issuer identity for tenant quotes/invoices (PDF + preview). */
export type FinanceIssuer = {
  organizationId: string | null;
  name: string;
  legalForm: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  ice: string;
  rc: string;
  taxId: string;
  capital: string;
  phone: string;
  email: string;
  website: string;
  iban: string;
  bank: string;
  tvaRate: number;
  /** Preferred logo URL for PDF / preview (same-origin proxy when possible). */
  logoUrl: string | null;
  /** Original stored logo URL (often Supabase public object). */
  storedLogoUrl: string | null;
};

export type FinanceOrgInput = {
  id: string;
  name: string;
  logo_url?: string | null;
  rc?: string | null;
  country?: string | null;
  city?: string | null;
  phone?: string | null;
  email_domain?: string | null;
};

export function financeIssuerFromOrganization(
  org: FinanceOrgInput | null | undefined
): FinanceIssuer {
  if (!org?.id || !org.name?.trim()) {
    return {
      organizationId: null,
      name: FUSION_COMPANY.name,
      legalForm: FUSION_COMPANY.legalForm,
      addressLine1: FUSION_COMPANY.addressLine1,
      addressLine2: FUSION_COMPANY.addressLine2,
      country: FUSION_COMPANY.country,
      ice: FUSION_COMPANY.ice,
      rc: FUSION_COMPANY.rc,
      taxId: FUSION_COMPANY.taxId,
      capital: FUSION_COMPANY.capital,
      phone: FUSION_COMPANY.phone,
      email: FUSION_COMPANY.email,
      website: FUSION_COMPANY.website,
      iban: FUSION_COMPANY.iban,
      bank: FUSION_COMPANY.bank,
      tvaRate: FUSION_COMPANY.tvaRate,
      logoUrl: FUSION_COMPANY.logoPath,
      storedLogoUrl: FUSION_COMPANY.logoPath,
    };
  }

  const domain = org.email_domain?.trim() || null;
  const city = org.city?.trim() || "";
  const country = org.country?.trim() || "";
  const location = [city, country].filter(Boolean).join(", ");
  const storedLogoUrl = org.logo_url?.trim() || null;
  const cacheKey = storedLogoUrl?.includes("?v=")
    ? storedLogoUrl.split("?v=")[1]?.split("&")[0]
    : null;

  return {
    organizationId: org.id,
    name: org.name.trim(),
    legalForm: "",
    addressLine1: location,
    addressLine2: "",
    country,
    ice: "",
    rc: org.rc?.trim() ? `RC ${org.rc.trim()}` : "",
    taxId: "",
    capital: "",
    phone: org.phone?.trim() || "",
    email: domain ? `contact@${domain}` : "",
    website: domain ? `www.${domain}` : "",
    iban: "",
    bank: "",
    tvaRate: FUSION_COMPANY.tvaRate,
    logoUrl: storedLogoUrl
      ? `/api/org-logos/${org.id}${cacheKey ? `?v=${cacheKey}` : ""}`
      : null,
    storedLogoUrl,
  };
}

/** Non-empty company lines for PDF header / preview. */
export function issuerCompanyLines(issuer: FinanceIssuer): string[] {
  const title = [issuer.name, issuer.legalForm].filter(Boolean).join("  ·  ");
  const address = [issuer.addressLine1, issuer.addressLine2]
    .filter(Boolean)
    .join(", ");
  const legal = [issuer.ice, issuer.rc, issuer.taxId].filter(Boolean).join("   ");
  const contact = [issuer.phone, issuer.email, issuer.website]
    .filter(Boolean)
    .join("   ");

  return [title, address, issuer.country, legal, issuer.capital, contact].filter(
    (line) => line.trim().length > 0
  );
}

export function issuerSubtitle(issuer: FinanceIssuer): string {
  const parts = [
    issuer.legalForm,
    issuer.addressLine1 || issuer.addressLine2 || issuer.country,
  ].filter(Boolean);
  return parts.join(" · ") || issuer.email || issuer.website || "";
}

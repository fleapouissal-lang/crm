export const DEFAULT_ORG_JOB_ROLES = [
  { name: "Directeur", slug: "directeur", is_default: true },
  { name: "Gérant", slug: "gerant", is_default: true },
  { name: "Développeur", slug: "developpeur", is_default: true },
  { name: "Designer", slug: "designer", is_default: true },
  { name: "Commercial", slug: "commercial", is_default: true },
  { name: "Comptable", slug: "comptable", is_default: true },
  { name: "Ressources Humaines", slug: "rh", is_default: true },
  { name: "Support", slug: "support", is_default: true },
] as const;

export function normalizeEmailDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/\.+$/, "");
}

export function extractEmailDomain(email: string): string | null {
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2 || !parts[1]) return null;
  return normalizeEmailDomain(parts[1]!);
}

export function emailMatchesDomain(email: string, domain: string): boolean {
  const emailDomain = extractEmailDomain(email);
  if (!emailDomain) return false;
  return emailDomain === normalizeEmailDomain(domain);
}

export function buildCompanyEmail(localPart: string, domain: string): string {
  const local = localPart.trim().toLowerCase().replace(/@.+$/, "");
  return `${local}@${normalizeEmailDomain(domain)}`;
}

export function slugifyRoleName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "role";
}

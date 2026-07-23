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

/** Local part only (before @). Strips any pasted domain/spaces. */
export function sanitizeEmailLocalPart(localPart: string): string {
  return localPart
    .trim()
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/\s+/g, "");
}

/**
 * Valid company mailbox local part: letters, digits, . _ -
 * Must start/end with alphanumeric; no consecutive dots.
 */
export function validateEmailLocalPart(
  localPart: string
): { ok: true; local: string } | { ok: false; error: string } {
  const local = sanitizeEmailLocalPart(localPart);
  if (!local) {
    return { ok: false, error: "Email local part is required" };
  }
  if (local.length > 64) {
    return { ok: false, error: "Email local part is too long" };
  }
  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(local)) {
    return {
      ok: false,
      error: "Use only letters, numbers, dots, hyphens or underscores",
    };
  }
  if (local.includes("..")) {
    return { ok: false, error: "Email local part cannot contain consecutive dots" };
  }
  return { ok: true, local };
}

export function buildCompanyEmail(localPart: string, domain: string): string {
  const local = sanitizeEmailLocalPart(localPart);
  return `${local}@${normalizeEmailDomain(domain)}`;
}

/** Any personal mailbox — not tied to the company domain. */
export function normalizePersonEmail(
  email: string
): { ok: true; email: string } | { ok: false; error: string } {
  const value = email.trim().toLowerCase();
  if (!value) {
    return { ok: false, error: "Email is required" };
  }
  // Practical check: local@domain with a dot in the domain
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { ok: false, error: "Enter a valid email address" };
  }
  if (value.length > 254) {
    return { ok: false, error: "Email is too long" };
  }
  return { ok: true, email: value };
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

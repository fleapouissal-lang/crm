/** Public logo URL stored on the organization row (Supabase public bucket). */
export function getOrgLogoSrc(
  organizationId: string | null | undefined,
  logoUrl: string | null | undefined
): string | null {
  if (!organizationId || !logoUrl?.trim()) return null;

  const trimmed = logoUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const cacheKey = trimmed.includes("?v=")
    ? trimmed.split("?v=")[1]?.split("&")[0]
    : null;
  return cacheKey
    ? `/api/org-logos/${organizationId}?v=${cacheKey}`
    : `/api/org-logos/${organizationId}`;
}

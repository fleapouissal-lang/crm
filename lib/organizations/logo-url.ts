/**
 * Preferred logo src for UI. Always goes through the same-origin proxy when we
 * have an organization id, because the org-logos bucket is often private and
 * direct Supabase public URLs break in the browser.
 */
export function getOrgLogoSrc(
  organizationId: string | null | undefined,
  logoUrl: string | null | undefined
): string | null {
  if (!organizationId) {
    const trimmed = logoUrl?.trim();
    if (trimmed && (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/"))) {
      return trimmed;
    }
    return null;
  }

  if (!logoUrl?.trim()) return null;

  const trimmed = logoUrl.trim();
  const cacheKey = trimmed.includes("?v=")
    ? trimmed.split("?v=")[1]?.split("&")[0]
    : null;

  return cacheKey
    ? `/api/org-logos/${organizationId}?v=${encodeURIComponent(cacheKey)}`
    : `/api/org-logos/${organizationId}`;
}

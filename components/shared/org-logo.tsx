"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { getOrgLogoSrc } from "@/lib/organizations/logo-url";
import { cn } from "@/lib/utils";

function directLogoUrl(logoUrl: string | null | undefined): string | null {
  const trimmed = logoUrl?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return trimmed;
  return null;
}

function proxyLogoUrl(
  organizationId: string | null | undefined,
  logoUrl?: string | null
): string | null {
  if (!organizationId) return null;
  const cacheKey = logoUrl?.includes("?v=")
    ? logoUrl.split("?v=")[1]?.split("&")[0]
    : null;
  return cacheKey
    ? `/api/org-logos/${organizationId}?v=${encodeURIComponent(cacheKey)}`
    : `/api/org-logos/${organizationId}`;
}

export function OrgLogo({
  organizationId,
  logoUrl,
  size = "md",
  className,
  alt = "",
}: {
  organizationId?: string | null;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  alt?: string;
}) {
  // Prefer same-origin proxy first — public Supabase URLs often 404 when the bucket is private.
  const candidates = useMemo(() => {
    const list: string[] = [];
    const proxy = proxyLogoUrl(organizationId, logoUrl);
    const primary = getOrgLogoSrc(organizationId, logoUrl);
    const direct = directLogoUrl(logoUrl);

    for (const url of [proxy, primary, direct]) {
      if (url && !list.includes(url)) list.push(url);
    }
    return list;
  }, [organizationId, logoUrl]);

  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [candidates.join("|")]);

  const sizeClass =
    size === "xs"
      ? "org-logo--xs"
      : size === "sm"
        ? "org-logo--sm"
        : size === "lg"
          ? "org-logo--lg"
          : "org-logo--md";

  if (!candidates.length || failed || index >= candidates.length) {
    return (
      <span
        className={cn("org-logo org-logo--fallback", sizeClass, className)}
        aria-label={alt || undefined}
        role={alt ? "img" : undefined}
      >
        <Building2 className="org-logo__icon" strokeWidth={1.75} />
      </span>
    );
  }

  const src = candidates[index]!;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={alt}
      className={cn("org-logo", sizeClass, className)}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setIndex((current) => {
          const next = current + 1;
          if (next >= candidates.length) {
            setFailed(true);
            return current;
          }
          return next;
        });
      }}
    />
  );
}

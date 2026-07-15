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

function proxyLogoUrl(organizationId: string | null | undefined): string | null {
  if (!organizationId) return null;
  return `/api/org-logos/${organizationId}`;
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
  const candidates = useMemo(() => {
    const list: string[] = [];
    const primary = getOrgLogoSrc(organizationId, logoUrl);
    const direct = directLogoUrl(logoUrl);
    const proxy = proxyLogoUrl(organizationId);

    for (const url of [primary, direct, proxy]) {
      if (url && !list.includes(url)) list.push(url);
    }
    return list;
  }, [organizationId, logoUrl]);

  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [candidates]);

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
        aria-hidden={!alt}
      >
        <Building2 className="org-logo__icon" strokeWidth={1.75} />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={candidates[index]}
      alt={alt}
      className={cn("org-logo", sizeClass, className)}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (index + 1 < candidates.length) {
          setIndex((i) => i + 1);
          return;
        }
        setFailed(true);
      }}
    />
  );
}

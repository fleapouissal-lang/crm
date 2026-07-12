"use client";

import { FusionLeapBrand } from "@/components/brand/fusion-leap-logo";
import { cn } from "@/lib/utils";

export function CompanyBrand({
  name,
  logoUrl,
  collapsed = false,
  className,
}: {
  name?: string | null;
  logoUrl?: string | null;
  collapsed?: boolean;
  className?: string;
}) {
  if (!logoUrl) {
    return <FusionLeapBrand collapsed={collapsed} className={className} />;
  }

  return (
    <div
      className={cn(
        "fusion-brand-logo fusion-org-brand",
        collapsed && "fusion-brand-logo--icon fusion-org-brand--icon",
        className
      )}
      title={name ?? undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={name ? `${name} logo` : "Company logo"}
        className="fusion-brand-logo-img fusion-org-brand__img"
        decoding="async"
      />
      {!collapsed && name ? (
        <span className="fusion-org-brand__name">{name}</span>
      ) : null}
    </div>
  );
}

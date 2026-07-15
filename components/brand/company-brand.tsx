"use client";

import { OrgLogo } from "@/components/shared/org-logo";
import { cn } from "@/lib/utils";

export function CompanyBrand({
  organizationId,
  name,
  logoUrl,
  collapsed = false,
  className,
}: {
  organizationId?: string | null;
  name?: string | null;
  logoUrl?: string | null;
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fusion-brand-logo fusion-org-brand fusion-org-brand--sidebar",
        collapsed && "fusion-org-brand--sidebar-collapsed",
        className
      )}
      title={name ?? undefined}
      aria-label={name ? `${name} logo` : "Company logo"}
    >
      <OrgLogo
        organizationId={organizationId}
        logoUrl={logoUrl}
        size={collapsed ? "md" : "lg"}
        className="fusion-org-brand__img"
        alt={name ? `${name} logo` : "Company logo"}
      />
    </div>
  );
}

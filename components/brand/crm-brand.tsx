"use client";

import { CrmLogo } from "@/components/brand/crm-logo";
import { cn } from "@/lib/utils";

export function CrmBrand({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <CrmLogo
      variant={collapsed ? "mark" : "compact"}
      className={cn(
        "fusion-brand-logo crm-brand-shell",
        collapsed && "fusion-brand-logo--icon crm-brand-shell--icon",
        className
      )}
    />
  );
}

"use client";

import { CrmLogo } from "@/components/brand/crm-logo";

export function LoginBrandLogo({
  className,
  variant = "form",
}: {
  className?: string;
  variant?: "form" | "topbar" | "hero" | "plain" | "split";
}) {
  return <CrmLogo variant={variant} className={className} />;
}

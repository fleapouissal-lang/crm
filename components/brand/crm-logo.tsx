"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/shared/theme-provider";
import { cn } from "@/lib/utils";

const CRM_ALT = "CRM";

export function CrmLogo({
  variant = "split",
  className,
}: {
  variant?: "form" | "topbar" | "hero" | "plain" | "split" | "compact" | "mark";
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : false;
  const textColor = isDark ? "#fafafa" : "#18181b";

  if (variant === "mark") {
    return (
      <div
        className={cn("crm-logo crm-logo--mark", className)}
        title={CRM_ALT}
        aria-label={CRM_ALT}
      >
        <span className="crm-logo__letter" style={{ color: textColor }}>
          C
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "crm-logo login-brand-logo",
        variant === "form" && "login-brand-logo--form",
        variant === "topbar" && "login-brand-logo--topbar",
        variant === "hero" && "login-brand-logo--hero",
        variant === "plain" && "login-brand-logo--plain",
        variant === "split" && "login-brand-logo--split",
        variant === "compact" && "crm-logo--compact",
        className
      )}
      aria-label={CRM_ALT}
    >
      <span className="crm-logo__word" style={{ color: textColor }}>
        CRM
      </span>
    </div>
  );
}

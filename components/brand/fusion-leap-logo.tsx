"use client";

import { cn } from "@/lib/utils";

const LOGO_SRC = "/brand/fusion-leap-logo-light.png?v=3";
const LOGO_ALT = "Fusion Leap — Intelligent Systems. Limitless Impact.";

export function FusionLeapBrand({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fusion-brand-logo",
        collapsed && "fusion-brand-logo--icon",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt={LOGO_ALT}
        className="fusion-brand-logo-img"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}

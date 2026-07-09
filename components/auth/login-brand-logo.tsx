"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const LOGO_LIGHT = "/brand/fusion-leap-logo-light.png";
const LOGO_BLACK = "/brand/fusion-leap-logo-black.png?v=4";
const LOGO_ALT = "Fusion Leap — Intelligent Systems. Limitless Impact.";

export function LoginBrandLogo({
  className,
  variant = "form",
}: {
  className?: string;
  variant?: "form" | "topbar" | "hero" | "plain" | "split";
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : false;
  const src =
    variant === "split"
      ? isDark
        ? LOGO_LIGHT
        : LOGO_BLACK
      : variant === "plain"
        ? isDark
          ? LOGO_LIGHT
          : LOGO_BLACK
        : LOGO_BLACK;

  return (
    <div
      className={cn(
        "login-brand-logo",
        variant === "form" && "login-brand-logo--form",
        variant === "topbar" && "login-brand-logo--topbar",
        variant === "hero" && "login-brand-logo--hero",
        variant === "plain" && "login-brand-logo--plain",
        variant === "split" && "login-brand-logo--split",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={LOGO_ALT}
        className="login-brand-logo__img"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useDict } from "@/components/shared/i18n-provider";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LoginMobileDashboardPreview } from "@/components/auth/login-mobile-dashboard-preview";

export function LoginVisualPanel() {
  const dict = useDict();

  return (
    <div className="login-split__showcase">
      <nav className="login-split__hero-nav" aria-label="Navigation">
        <div className="login-split__hero-nav-links">
          <Link href="/pricing">{dict.auth.loginNavPricing}</Link>
          <Link href="/faq">{dict.auth.loginNavFaq}</Link>
          <Link href="/about">{dict.auth.loginNavAbout}</Link>
        </div>
        <div className="login-split__hero-nav-tools">
          <ThemeToggle className="login-split__hero-icon-btn" />
          <LocaleSwitcher variant="icon" iconClassName="login-split__hero-icon-btn" />
        </div>
        <Link href="/contact" className="login-split__hero-nav-cta">
          {dict.auth.loginNavCta}
        </Link>
      </nav>

      <div className="login-split__hero-glow" aria-hidden />
      <div className="login-split__hero-glow login-split__hero-glow--2" aria-hidden />

      <div className="login-split__phone-stage">
        <LoginMobileDashboardPreview framed />
      </div>
    </div>
  );
}

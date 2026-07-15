"use client";

import Link from "next/link";
import { LoginBrandLogo } from "@/components/auth/login-brand-logo";
import { LoginStaticBackground } from "@/components/auth/login-static-bg";
import { LoginVisualPanel } from "@/components/auth/login-visual-panel";
import { LoginMobileDashboardPreview } from "@/components/auth/login-mobile-dashboard-preview";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { isRtlLocale } from "@/lib/i18n/locale-utils";

export function NotFoundView() {
  const dict = useDict();
  const { locale } = useI18n();
  const rtl = isRtlLocale(locale);
  const e = dict.errors;

  return (
    <div className="login-split">
      <LoginStaticBackground />
      <section className="login-split__panel" dir="ltr">
        <header className="login-split__top">
          <LoginBrandLogo variant="split" className="login-split__logo" />
          <div className="login-split__tools login-split__tools--mobile">
            <ThemeToggle className="login-split__hero-icon-btn" />
            <LocaleSwitcher variant="icon" iconClassName="login-split__hero-icon-btn" />
          </div>
        </header>

        <div className="login-split__content not-found__content" dir={rtl ? "rtl" : "ltr"}>
          <p className="not-found__code" aria-hidden>
            {e.notFoundCode}
          </p>

          <div className="login-split__intro not-found__intro">
            <h1>{e.notFoundHeading}</h1>
            <p>{e.notFoundDescription}</p>
          </div>

          <LoginMobileDashboardPreview className="login-split__mobile-preview" />

          <div className="not-found__actions">
            <Link href="/" className="login-split__submit not-found__btn">
              {e.notFoundBackHome}
            </Link>
            <Link href="/login" className="not-found__btn-secondary">
              {e.notFoundGoLogin}
            </Link>
          </div>
        </div>

        <footer className="login-split__legal">
          <span>© {new Date().getFullYear()} CRM</span>
        </footer>
      </section>

      <section className="login-split__visual" aria-hidden={false}>
        <LoginVisualPanel />
      </section>
    </div>
  );
}
